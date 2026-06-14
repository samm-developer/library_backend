import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import feeRoutes from "./routes/feeRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve uploaded files
  app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

  app.get("/", (_req, res) => {
    res.json({
      name: "Library Management System test API",
      status: "running",
      version: "1.0.0",
      endpoints: {
        health: "GET /api/health",
        auth: {
          register: "POST /api/auth/register",
          login: "POST /api/auth/login",
          me: "GET /api/auth/me",
        },
        fees: {
          status: "GET /api/fees/status",
          pay: "POST /api/fees/pay",
        },
        admin: {
          stats: "GET /api/admin/stats",
          students: "GET /api/admin/students",
          defaulters: "GET /api/admin/defaulters",
          student: "GET /api/admin/students/:id",
        },
      },
    });
  });

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/fees", feeRoutes);
  app.use("/api/admin", adminRoutes);

  // Multer / generic error handler
  app.use((err, _req, res, _next) => {
    console.error(err.message);
    res.status(err.status || 400).json({ message: err.message || "Server error" });
  });

  return app;
}
