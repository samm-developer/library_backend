import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/library",
  jwtSecret: process.env.JWT_SECRET || "super_secret_change_me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  feePerHour: Number(process.env.FEE_PER_HOUR || 100),
  paidPeriodDays: Number(process.env.PAID_PERIOD_DAYS || 30),
  adminEmail: process.env.ADMIN_EMAIL || "admin@library.com",
  adminPassword: process.env.ADMIN_PASSWORD || "admin123",

  // Notification microservice (preferred). If unset, backend falls back to
  // sending email in-process via SMTP, or to console logging.
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || "",
  notificationServiceToken: process.env.NOTIFICATION_SERVICE_TOKEN || "",

  // In-process SMTP fallback (used only when notificationServiceUrl is empty).
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  mailFrom:
    process.env.MAIL_FROM ||
    "The King's Library <no-reply@thekingslibrary.in>",
};
