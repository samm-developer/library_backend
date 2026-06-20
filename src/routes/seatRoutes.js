import { Router } from "express";
import {
  listSeats,
  getAvailability,
  bookSeat,
  myBookings,
  cancelBooking,
} from "../controllers/seatController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", listSeats);
router.get("/availability", getAvailability);

router.post("/book", requireAuth, bookSeat);
router.get("/my-bookings", requireAuth, myBookings);
router.post("/bookings/:id/cancel", requireAuth, cancelBooking);

export default router;
