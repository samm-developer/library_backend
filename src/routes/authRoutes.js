import { Router } from "express";
import { register, login, me } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.post(
  "/register",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "idPhoto", maxCount: 1 },
  ]),
  register
);
router.post("/login", login);
router.get("/me", requireAuth, me);

export default router;
