import { Book } from "../models/Book.js";
import { BookTransaction } from "../models/BookTransaction.js";
import { withTransaction } from "../utils/withTransaction.js";
import { dispatchNotification } from "../services/notificationService.js";

function escapeRegex(str = "") {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeRef(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// GET /api/books?search=&category=&page=&limit=
export async function listBooks(req, res) {
  const { search = "", category = "" } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));

  const filter = { isActive: true };
  if (category) filter.category = category;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ title: rx }, { author: rx }, { category: rx }];
  }

  const [books, total] = await Promise.all([
    Book.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Book.countDocuments(filter),
  ]);

  return res.json({
    books,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}

// GET /api/books/suggestions?q=
// Lightweight, indexed prefix/substring matches for the search box.
export async function bookSuggestions(req, res) {
  const q = (req.query.q || "").trim();
  if (!q) return res.json({ suggestions: [] });

  const rx = new RegExp("^" + escapeRegex(q), "i");
  const rxAny = new RegExp(escapeRegex(q), "i");

  const books = await Book.find(
    { isActive: true, $or: [{ title: rxAny }, { author: rxAny }] },
    { title: 1, author: 1, category: 1, availableForRent: 1, stockForSale: 1 }
  )
    .sort({ title: 1 })
    .limit(8);

  // Prefer prefix matches first for nicer suggestions.
  const suggestions = books.sort((a, b) => {
    const ap = rx.test(a.title) ? 0 : 1;
    const bp = rx.test(b.title) ? 0 : 1;
    return ap - bp;
  });

  return res.json({ suggestions });
}

// GET /api/books/:id
export async function getBook(req, res) {
  const book = await Book.findById(req.params.id);
  if (!book || !book.isActive) {
    return res.status(404).json({ message: "Book not found" });
  }
  return res.json({ book });
}

// POST /api/books/:id/rent  { days }
export async function rentBook(req, res) {
  try {
    const days = Math.max(1, Number(req.body.days) || 7);

    const result = await withTransaction(async (session) => {
      const opt = session ? { session } : {};

      // Atomic conditional decrement: only succeeds if a copy is free.
      const book = await Book.findOneAndUpdate(
        { _id: req.params.id, isActive: true, availableForRent: { $gt: 0 } },
        { $inc: { availableForRent: -1 } },
        { new: true, ...opt }
      );
      if (!book) {
        throw Object.assign(
          new Error("Book is not available for rent right now"),
          { status: 409 }
        );
      }

      const rentStart = new Date();
      const rentDue = new Date(rentStart);
      rentDue.setDate(rentDue.getDate() + days);
      const amount = book.rentPricePerDay * days;

      const [txn] = await BookTransaction.create(
        [
          {
            user: req.user._id,
            book: book._id,
            bookTitle: book.title,
            type: "rent",
            quantity: 1,
            amount,
            rentDays: days,
            rentStart,
            rentDue,
            status: "rented",
            reference: makeRef("RENT"),
          },
        ],
        opt
      );

      return { book, txn };
    });

    dispatchNotification({
      user: req.user,
      type: "rent_confirmation",
      subject: "Book rental confirmed",
      message: `You rented "${result.book.title}" for ${result.txn.rentDays} days. Due on ${
        result.txn.rentDue.toISOString().split("T")[0]
      }. Amount: ₹${result.txn.amount}.`,
    });

    return res.status(201).json({
      message: "Book rented",
      transaction: result.txn,
      book: result.book,
    });
  } catch (err) {
    console.error("rentBook error:", err.message);
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Rent failed" });
  }
}

// POST /api/books/:id/purchase  { quantity }
export async function purchaseBook(req, res) {
  try {
    const quantity = Math.max(1, Number(req.body.quantity) || 1);

    const result = await withTransaction(async (session) => {
      const opt = session ? { session } : {};

      const book = await Book.findOneAndUpdate(
        { _id: req.params.id, isActive: true, stockForSale: { $gte: quantity } },
        { $inc: { stockForSale: -quantity } },
        { new: true, ...opt }
      );
      if (!book) {
        throw Object.assign(new Error("Not enough stock to purchase"), {
          status: 409,
        });
      }

      const amount = book.purchasePrice * quantity;
      const [txn] = await BookTransaction.create(
        [
          {
            user: req.user._id,
            book: book._id,
            bookTitle: book.title,
            type: "purchase",
            quantity,
            amount,
            status: "purchased",
            reference: makeRef("BUY"),
          },
        ],
        opt
      );

      return { book, txn };
    });

    dispatchNotification({
      user: req.user,
      type: "purchase_confirmation",
      subject: "Book purchase confirmed",
      message: `You purchased ${result.txn.quantity} x "${result.book.title}" for ₹${result.txn.amount}.`,
    });

    return res.status(201).json({
      message: "Purchase successful",
      transaction: result.txn,
      book: result.book,
    });
  } catch (err) {
    console.error("purchaseBook error:", err.message);
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Purchase failed" });
  }
}

// POST /api/books/transactions/:txnId/return
export async function returnBook(req, res) {
  try {
    const result = await withTransaction(async (session) => {
      const opt = session ? { session } : {};

      const txn = await BookTransaction.findOne(
        {
          _id: req.params.txnId,
          user: req.user._id,
          type: "rent",
          status: "rented",
        },
        null,
        opt
      );
      if (!txn) {
        throw Object.assign(new Error("Active rental not found"), {
          status: 404,
        });
      }

      txn.status = "returned";
      txn.returnedAt = new Date();
      await txn.save(opt);

      // Return the copy to the rentable pool.
      const book = await Book.findByIdAndUpdate(
        txn.book,
        { $inc: { availableForRent: 1 } },
        { new: true, ...opt }
      );

      return { txn, book };
    });

    dispatchNotification({
      user: req.user,
      type: "book_return",
      subject: "Book returned",
      message: `You returned "${result.txn.bookTitle}". Thank you!`,
    });

    return res.json({
      message: "Book returned",
      transaction: result.txn,
      book: result.book,
    });
  } catch (err) {
    console.error("returnBook error:", err.message);
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Return failed" });
  }
}

// GET /api/books/my/transactions  (current user's rentals & purchases)
export async function myBookTransactions(req, res) {
  const transactions = await BookTransaction.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(100);
  return res.json({ count: transactions.length, transactions });
}

// ---- Admin CRUD ----

// POST /api/books  (admin)
export async function createBook(req, res) {
  try {
    const b = req.body;
    const book = await Book.create({
      title: b.title,
      author: b.author,
      isbn: b.isbn,
      category: b.category,
      description: b.description,
      coverImage: b.coverImage,
      purchasePrice: Number(b.purchasePrice) || 0,
      rentPricePerDay: Number(b.rentPricePerDay) || 0,
      copiesForRent: Number(b.copiesForRent) || 0,
      availableForRent:
        b.availableForRent != null
          ? Number(b.availableForRent)
          : Number(b.copiesForRent) || 0,
      stockForSale: Number(b.stockForSale) || 0,
    });
    return res.status(201).json({ book });
  } catch (err) {
    console.error("createBook error:", err.message);
    return res.status(400).json({ message: err.message || "Create failed" });
  }
}

// PUT /api/books/:id  (admin)
export async function updateBook(req, res) {
  const book = await Book.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!book) return res.status(404).json({ message: "Book not found" });
  return res.json({ book });
}

// DELETE /api/books/:id  (admin, soft delete)
export async function deleteBook(req, res) {
  const book = await Book.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!book) return res.status(404).json({ message: "Book not found" });
  return res.json({ message: "Book removed" });
}
