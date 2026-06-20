import { Router } from "express";
import {
  listBooks,
  bookSuggestions,
  getBook,
  rentBook,
  purchaseBook,
  returnBook,
  myBookTransactions,
  createBook,
  updateBook,
  deleteBook,
} from "../controllers/bookController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// Public catalog + search
router.get("/", listBooks);
router.get("/suggestions", bookSuggestions);

// Current user's history (must come before "/:id")
router.get("/my/transactions", requireAuth, myBookTransactions);

// Admin CRUD
router.post("/", requireAuth, requireAdmin, createBook);
router.put("/:id", requireAuth, requireAdmin, updateBook);
router.delete("/:id", requireAuth, requireAdmin, deleteBook);

// Single book
router.get("/:id", getBook);

// Rent / purchase / return
router.post("/:id/rent", requireAuth, rentBook);
router.post("/:id/purchase", requireAuth, purchaseBook);
router.post("/transactions/:txnId/return", requireAuth, returnBook);

export default router;
