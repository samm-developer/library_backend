import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { dispatchNotification } from "../services/notificationService.js";

// Sends a fee-due reminder to students whose paid period has expired or
// expires within the next `DAYS_AHEAD` days. Run on a schedule (cron).
const DAYS_AHEAD = Number(process.env.REMINDER_DAYS_AHEAD || 3);

async function run() {
  await connectDB();

  const now = new Date();
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + DAYS_AHEAD);

  // Expired (or never paid) OR expiring within the window.
  const students = await User.find({
    role: "student",
    $or: [{ paidUntil: null }, { paidUntil: { $lte: threshold } }],
  });

  console.log(`Found ${students.length} student(s) to remind.`);

  for (const student of students) {
    const due =
      !student.paidUntil || new Date(student.paidUntil) < now
        ? "now overdue"
        : `due on ${new Date(student.paidUntil).toISOString().split("T")[0]}`;

    // eslint-disable-next-line no-await-in-loop
    await dispatchNotification({
      user: student,
      type: "fee_reminder",
      subject: "Library fee reminder",
      message: `Hi ${student.name.split(" ")[0]}, your monthly seat fee is ${due}. Please pay via the portal to keep your seat active.`,
    });
  }

  console.log("Fee reminders dispatched.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Fee reminder job failed:", err);
  process.exit(1);
});
