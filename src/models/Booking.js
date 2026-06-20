import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seat: { type: mongoose.Schema.Types.ObjectId, ref: "Seat", required: true },
    seatNumber: { type: Number, required: true },

    // Day of the booking, normalized to midnight (UTC) for grouping.
    date: { type: Date, required: true },
    // Time slot stored as minutes from midnight for easy overlap math.
    startMinute: { type: Number, required: true, min: 0, max: 1440 },
    endMinute: { type: Number, required: true, min: 0, max: 1440 },

    status: {
      type: String,
      enum: ["active", "cancelled", "completed"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Core query path for conflict detection: a seat's bookings on a given day.
bookingSchema.index({ seat: 1, date: 1, status: 1 });
// A user's bookings, most recent first.
bookingSchema.index({ user: 1, date: -1 });

export const Booking = mongoose.model("Booking", bookingSchema);
