import mongoose from "mongoose";

const seatSchema = new mongoose.Schema(
  {
    // Human-friendly seat/chair number, unique across the library.
    seatNumber: { type: Number, required: true, unique: true },
    zone: { type: String, trim: true, default: "Main Hall" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

seatSchema.index({ isActive: 1 });

export const Seat = mongoose.model("Seat", seatSchema);
