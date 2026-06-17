import crypto from "crypto";
import { config } from "../config/env.js";
import { Payment } from "../models/Payment.js";
import { User } from "../models/User.js";
import { feeStatus, monthlyFee } from "../utils/fee.js";

// GET /api/fees/status  (current student)
export async function getMyFeeStatus(req, res) {
  const status = feeStatus(req.user);
  const payments = await Payment.find({ user: req.user._id }).sort({ createdAt: -1 });
  return res.json({ status, payments });
}

// POST /api/fees/pay  (current student)
// Razorpay Order Creation
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

    // Create a pending Payment record
    const payment = await Payment.create({
      user: user._id,
      amount,
      hours: user.hours,
      periodStart,
      periodEnd,
      reference,
      status: "pending",
    });

    console.log(`Creating Razorpay order for ${user.email}, amount: ₹${amount}`);

    // Create a Razorpay Order using HTTP Basic Authentication
    const basicAuth = Buffer.from(`${config.razorpayKeyId}:${config.razorpayKeySecret}`).toString("base64");

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        amount: amount * 100, // Razorpay expects amount in paise
        currency: "INR",
        receipt: reference,
      }),
    });

    const order = await response.json();

    if (order.id) {
      return res.json({
        key: config.razorpayKeyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        reference,
      });
    } else {
      console.error("Razorpay order creation failed:", order);
      payment.status = "failed";
      await payment.save();
      return res.status(400).json({ message: order.error?.description || "Order creation failed" });
    }
  } catch (err) {
    console.error("payFee error:", err);
    return res.status(500).json({ message: "Payment initialization failed" });
  }
}

// POST /api/fees/verify  (current student)
// Razorpay Payment Verification
export async function verifyRazorpayPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, reference } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !reference) {
      return res.status(400).json({ message: "Missing payment verification parameters" });
    }

    const payment = await Payment.findOne({ reference });
    if (!payment) {
      return res.status(404).json({ message: "Payment record not found" });
    }

    // Verify signature
    const stringToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac("sha256", config.razorpayKeySecret)
      .update(stringToSign)
      .digest("hex");

    if (generatedSignature === razorpay_signature) {
      payment.status = "success";
      await payment.save();

      const user = await User.findById(payment.user);
      if (user) {
        const now = new Date();
        const base =
          user.paidUntil && new Date(user.paidUntil) > now
            ? new Date(user.paidUntil)
            : now;

        const periodEnd = new Date(base);
        periodEnd.setDate(periodEnd.getDate() + config.paidPeriodDays);

        user.paidUntil = periodEnd;
        await user.save();
        console.log(`Razorpay payment successful for user ${user.email}. Extended until ${periodEnd}`);
      }

      return res.json({ success: true, message: "Payment verified successfully" });
    } else {
      console.warn(`Signature mismatch for transaction ${reference}`);
      payment.status = "failed";
      await payment.save();
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }
  } catch (err) {
    console.error("verifyPayment error:", err);
    return res.status(500).json({ message: "Payment verification error" });
  }
}
