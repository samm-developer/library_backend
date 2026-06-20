import { Router } from "express";
import {
  myNotifications,
  markRead,
  markAllRead,
} from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", myNotifications);
router.post("/read-all", markAllRead);
router.post("/:id/read", markRead);

export default router;
