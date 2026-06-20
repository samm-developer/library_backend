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

// Speed up per-user payment history and date-range revenue queries.
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ periodEnd: 1 });

export const Payment = mongoose.model("Payment", paymentSchema);
