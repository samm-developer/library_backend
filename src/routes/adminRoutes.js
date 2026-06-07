import { Router } from "express";
import {
  listStudents,
  listDefaulters,
  getStudent,
  getStats,
} from "../controllers/adminController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/stats", getStats);
router.get("/students", listStudents);
router.get("/defaulters", listDefaulters);
router.get("/students/:id", getStudent);

export default router;
