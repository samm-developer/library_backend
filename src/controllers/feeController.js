import { config } from "../config/env.js";
import { Payment } from "../models/Payment.js";
import { feeStatus, monthlyFee } from "../utils/fee.js";

// GET /api/fees/status  (current student)
export async function getMyFeeStatus(req, res) {
  const status = feeStatus(req.user);
  const payments = await Payment.find({ user: req.user._id }).sort({ createdAt: -1 });
  return res.json({ status, payments });
}

// POST /api/fees/pay  (current student)
// Mock payment: marks fee paid for one period (default 30 days).
export async function payFee(req, res) {
  try {
    const user = req.user;
    const now = new Date();

    // If still within a paid period, extend from paidUntil; otherwise from now.
    const base =
      user.paidUntil && new Date(user.paidUntil) > now
        ? new Date(user.paidUntil)
        : now;

    const periodStart = base;
    const periodEnd = new Date(base);
    periodEnd.setDate(periodEnd.getDate() + config.paidPeriodDays);

    const amount = monthlyFee(user.hours);
    const reference = `PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const payment = await Payment.create({
      user: user._id,
      amount,
      hours: user.hours,
      periodStart,
      periodEnd,
      reference,
    });

    user.paidUntil = periodEnd;
    await user.save();

    return res.status(201).json({
      message: "Payment successful",
      payment,
      status: feeStatus(user),
    });
  } catch (err) {
    console.error("payFee error:", err);
    return res.status(500).json({ message: "Payment failed" });
  }
}
