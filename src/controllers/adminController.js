import { User } from "../models/User.js";
import { Payment } from "../models/Payment.js";
import { feeStatus } from "../utils/fee.js";

// GET /api/admin/students  -> all students with fee status
export async function listStudents(req, res) {
  const students = await User.find({ role: "student" }).sort({ createdAt: -1 });
  const data = students.map((s) => ({
    ...s.toJSON(),
    fee: feeStatus(s),
  }));
  return res.json({ count: data.length, students: data });
}

// GET /api/admin/defaulters?date=YYYY-MM-DD
// Students whose fee is unpaid as of the given date (default: today).
export async function listDefaulters(req, res) {
  const asOf = req.query.date ? new Date(req.query.date) : new Date();

  const students = await User.find({ role: "student" });
  const defaulters = students
    .map((s) => ({ student: s, fee: feeStatus(s, asOf) }))
    .filter((x) => x.fee.isDefaulter)
    .map((x) => ({ ...x.student.toJSON(), fee: x.fee }));

  return res.json({
    asOf,
    count: defaulters.length,
    defaulters,
  });
}

// GET /api/admin/students/:id  -> full info on one student
export async function getStudent(req, res) {
  const student = await User.findById(req.params.id);
  if (!student || student.role !== "student") {
    return res.status(404).json({ message: "Student not found" });
  }

  const payments = await Payment.find({ user: student._id }).sort({ createdAt: -1 });
  return res.json({
    student: { ...student.toJSON(), fee: feeStatus(student) },
    payments,
  });
}

// GET /api/admin/stats -> quick dashboard numbers
export async function getStats(req, res) {
  const students = await User.find({ role: "student" });
  const now = new Date();
  const defaulters = students.filter((s) => feeStatus(s, now).isDefaulter);
  const collected = await Payment.aggregate([
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  return res.json({
    totalStudents: students.length,
    defaulters: defaulters.length,
    paidStudents: students.length - defaulters.length,
    totalCollected: collected[0]?.total || 0,
  });
}
