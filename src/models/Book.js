import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    isbn: { type: String, trim: true, default: "" },
    category: { type: String, trim: true, default: "General" },
    description: { type: String, trim: true, default: "" },
    coverImage: { type: String, default: "" },

    // Pricing
    purchasePrice: { type: Number, required: true, min: 0 },
    rentPricePerDay: { type: Number, required: true, min: 0 },

    // Inventory
    // copiesForRent: total copies that can be lent; availableForRent: currently free
    copiesForRent: { type: Number, required: true, min: 0, default: 0 },
    availableForRent: { type: Number, required: true, min: 0, default: 0 },
    // stockForSale: physical copies available to purchase
    stockForSale: { type: Number, required: true, min: 0, default: 0 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Text index powers fuzzy search across title/author/category.
bookSchema.index({ title: "text", author: "text", category: "text" });
// Plain indexes power suggestions (prefix regex) and filtering.
bookSchema.index({ title: 1 });
bookSchema.index({ author: 1 });
bookSchema.index({ category: 1 });
bookSchema.index({ isbn: 1 });

export const Book = mongoose.model("Book", bookSchema);
