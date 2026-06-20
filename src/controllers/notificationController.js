import { Notification } from "../models/Notification.js";

// GET /api/notifications  (current user)
export async function myNotifications(req, res) {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);
  const unread = await Notification.countDocuments({
    user: req.user._id,
    read: false,
  });
  return res.json({ unread, notifications });
}

// POST /api/notifications/:id/read
export async function markRead(req, res) {
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );
  if (!n) return res.status(404).json({ message: "Notification not found" });
  return res.json({ notification: n });
}

// POST /api/notifications/read-all
export async function markAllRead(req, res) {
  await Notification.updateMany(
    { user: req.user._id, read: false },
    { read: true }
  );
  return res.json({ message: "All marked read" });
}
