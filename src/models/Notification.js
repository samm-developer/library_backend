import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "payment_confirmation",
        "fee_reminder",
        "booking_confirmation",
        "booking_cancelled",
        "rent_confirmation",
        "purchase_confirmation",
        "book_return",
      ],
      required: true,
    },
    channel: { type: String, enum: ["email", "inapp"], default: "email" },
    to: { type: String, default: "" },
    subject: { type: String, required: true },
    message: { type: String, required: true },

    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
    error: { type: String, default: "" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ status: 1 });

export const Notification = mongoose.model("Notification", notificationSchema);
