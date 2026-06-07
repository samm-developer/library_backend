import { Router } from "express";
import { getMyFeeStatus, payFee } from "../controllers/feeController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/status", requireAuth, getMyFeeStatus);
router.post("/pay", requireAuth, payFee);

export default router;
