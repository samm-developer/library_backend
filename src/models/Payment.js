import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    hours: { type: Number, required: true },
    // The period this payment covers
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    // Simple mock transaction reference (no real gateway involved)
    reference: { type: String, required: true },
  },
  { timestamps: true }
);

export const Payment = mongoose.model("Payment", paymentSchema);
