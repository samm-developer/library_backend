import mongoose from "mongoose";

const bookTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    bookTitle: { type: String, required: true },

    type: { type: String, enum: ["rent", "purchase"], required: true },
    quantity: { type: Number, default: 1, min: 1 },
    amount: { type: Number, required: true, min: 0 },

    // Rent lifecycle
    rentDays: { type: Number, default: 0 },
    rentStart: { type: Date, default: null },
    rentDue: { type: Date, default: null },
    returnedAt: { type: Date, default: null },

    status: {
      type: String,
      enum: ["rented", "returned", "purchased"],
      required: true,
    },
    reference: { type: String, required: true },
  },
  { timestamps: true }
);

bookTransactionSchema.index({ user: 1, createdAt: -1 });
bookTransactionSchema.index({ book: 1 });
bookTransactionSchema.index({ status: 1 });

export const BookTransaction = mongoose.model(
  "BookTransaction",
  bookTransactionSchema
);
