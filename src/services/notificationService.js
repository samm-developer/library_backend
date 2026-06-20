import nodemailer from "nodemailer";
import { config } from "../config/env.js";
import { Notification } from "../models/Notification.js";

// Lazy in-process transporter (fallback when no microservice is configured).
let transporter = null;
if (!config.notificationServiceUrl && config.smtpHost && config.smtpUser) {
  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: { user: config.smtpUser, pass: config.smtpPass },
  });
}

async function deliver({ to, subject, message, html, type }) {
  // 1) Prefer the dedicated notification microservice.
  if (config.notificationServiceUrl) {
    const res = await fetch(`${config.notificationServiceUrl}/api/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.notificationServiceToken
          ? { "x-service-token": config.notificationServiceToken }
          : {}),
      },
      body: JSON.stringify({ to, subject, message, html, type }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Notification service responded ${res.status}: ${body}`);
    }
    return;
  }

  // 2) In-process SMTP fallback.
  if (transporter) {
    await transporter.sendMail({
      from: config.mailFrom,
      to,
      subject,
      text: message,
      html: html || `<p>${message}</p>`,
    });
    return;
  }

  // 3) Dev log fallback so the flow is observable without any email setup.
  console.log(`[notification:${type}] -> ${to} | ${subject} | ${message}`);
}

/**
 * Records a notification and attempts delivery. Fire-and-forget friendly:
 * never throws to the caller so business flows aren't blocked by email issues.
 */
export async function dispatchNotification({
  user,
  type,
  subject,
  message,
  html,
}) {
  const to = user?.email || "";
  const doc = await Notification.create({
    user: user?._id,
    type,
    channel: "email",
    to,
    subject,
    message,
    status: "pending",
  });

  try {
    await deliver({ to, subject, message, html, type });
    doc.status = "sent";
    await doc.save();
  } catch (err) {
    doc.status = "failed";
    doc.error = err.message;
    await doc.save();
    console.error(`[notification] delivery failed (${type}):`, err.message);
  }

  return doc;
}
