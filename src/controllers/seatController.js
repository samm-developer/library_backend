import { Seat } from "../models/Seat.js";
import { Booking } from "../models/Booking.js";
import { withTransaction } from "../utils/withTransaction.js";
import { dispatchNotification } from "../services/notificationService.js";

// "HH:MM" -> minutes from midnight
function toMinutes(hhmm) {
  if (typeof hhmm !== "string" || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (h > 24 || m > 59) return null;
  return h * 60 + m;
}

function minutesToHHMM(min) {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

// Normalize a YYYY-MM-DD (or date) to midnight UTC for day grouping.
function dayStart(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// GET /api/seats  -> list active seats
export async function listSeats(_req, res) {
  const seats = await Seat.find({ isActive: true }).sort({ seatNumber: 1 });
  return res.json({ count: seats.length, seats });
}

// GET /api/seats/availability?date=&start=&end=
// Returns each active seat with a computed `available` flag for the slot.
export async function getAvailability(req, res) {
  const { date, start, end } = req.query;
  const day = dayStart(date);
  const startMinute = toMinutes(start);
  const endMinute = toMinutes(end);

  if (!day || startMinute === null || endMinute === null) {
    return res
      .status(400)
      .json({ message: "Valid date, start and end (HH:MM) are required" });
  }
  if (startMinute >= endMinute) {
    return res.status(400).json({ message: "start must be before end" });
  }

  const seats = await Seat.find({ isActive: true }).sort({ seatNumber: 1 });

  // One query for all overlapping bookings that day.
  const bookings = await Booking.find({
    date: day,
    status: "active",
    startMinute: { $lt: endMinute },
    endMinute: { $gt: startMinute },
  });

  const takenSeatIds = new Set(bookings.map((b) => String(b.seat)));
  const result = seats.map((s) => ({
    _id: s._id,
    seatNumber: s.seatNumber,
    zone: s.zone,
    available: !takenSeatIds.has(String(s._id)),
  }));

  return res.json({
    date: day,
    slot: { start: minutesToHHMM(startMinute), end: minutesToHHMM(endMinute) },
    availableCount: result.filter((r) => r.available).length,
    seats: result,
  });
}

// POST /api/seats/book  { date, start, end, seatNumber? }
// Real-time allocation using a transaction with automatic rollback on conflict.
export async function bookSeat(req, res) {
  try {
    const { date, start, end, seatNumber } = req.body;
    const day = dayStart(date);
    const startMinute = toMinutes(start);
    const endMinute = toMinutes(end);

    if (!day || startMinute === null || endMinute === null) {
      return res
        .status(400)
        .json({ message: "Valid date, start and end (HH:MM) are required" });
    }
    if (startMinute >= endMinute) {
      return res.status(400).json({ message: "start must be before end" });
    }

    const userId = req.user._id;

    const booking = await withTransaction(async (session) => {
      const opt = session ? { session } : {};

      // Helper: does this seat have an overlapping active booking?
      const hasConflict = async (seatId) => {
        const conflict = await Booking.findOne(
          {
            seat: seatId,
            date: day,
            status: "active",
            startMinute: { $lt: endMinute },
            endMinute: { $gt: startMinute },
          },
          null,
          opt
        );
        return Boolean(conflict);
      };

      // Resolve target seat: explicit pick or auto-allocate first free one.
      let seat = null;
      if (seatNumber != null) {
        seat = await Seat.findOne(
          { seatNumber: Number(seatNumber), isActive: true },
          null,
          opt
        );
        if (!seat) throw Object.assign(new Error("Seat not found"), { status: 404 });
        if (await hasConflict(seat._id)) {
          throw Object.assign(
            new Error(`Seat ${seatNumber} is already booked for this slot`),
            { status: 409 }
          );
        }
      } else {
        const seats = await Seat.find({ isActive: true }, null, opt).sort({
          seatNumber: 1,
        });
        for (const candidate of seats) {
          // eslint-disable-next-line no-await-in-loop
          if (!(await hasConflict(candidate._id))) {
            seat = candidate;
            break;
          }
        }
        if (!seat) {
          throw Object.assign(
            new Error("No seats available for the selected time slot"),
            { status: 409 }
          );
        }
      }

      // Create the booking inside the transaction.
      const [created] = await Booking.create(
        [
          {
            user: userId,
            seat: seat._id,
            seatNumber: seat.seatNumber,
            date: day,
            startMinute,
            endMinute,
            status: "active",
          },
        ],
        opt
      );

      // Verify no double-allocation slipped in; if so, abort (rollback).
      const overlapCount = await Booking.countDocuments(
        {
          seat: seat._id,
          date: day,
          status: "active",
          startMinute: { $lt: endMinute },
          endMinute: { $gt: startMinute },
        },
        opt
      );
      if (overlapCount > 1) {
        throw Object.assign(
          new Error("Seat was just taken, please retry"),
          { status: 409 }
        );
      }

      return created;
    });

    // Best-effort booking confirmation (non-blocking).
    dispatchNotification({
      user: req.user,
      type: "booking_confirmation",
      subject: "Seat booking confirmed",
      message: `Your seat #${booking.seatNumber} is booked for ${minutesToHHMM(
        booking.startMinute
      )}-${minutesToHHMM(booking.endMinute)} on ${
        booking.date.toISOString().split("T")[0]
      }.`,
    });

    return res.status(201).json({ message: "Seat booked", booking });
  } catch (err) {
    console.error("bookSeat error:", err.message);
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Booking failed" });
  }
}

// GET /api/seats/my-bookings
export async function myBookings(req, res) {
  const bookings = await Booking.find({ user: req.user._id })
    .sort({ date: -1, startMinute: 1 })
    .limit(100);
  return res.json({ count: bookings.length, bookings });
}

// POST /api/seats/bookings/:id/cancel
export async function cancelBooking(req, res) {
  const booking = await Booking.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (booking.status !== "active") {
    return res.status(400).json({ message: "Booking is not active" });
  }

  booking.status = "cancelled";
  await booking.save();

  dispatchNotification({
    user: req.user,
    type: "booking_cancelled",
    subject: "Seat booking cancelled",
    message: `Your booking for seat #${booking.seatNumber} has been cancelled.`,
  });

  return res.json({ message: "Booking cancelled", booking });
}
