import { User } from "../models/User.js";
import { signToken } from "../middleware/auth.js";

const REQUIRED_FIELDS = [
  "name",
  "fatherName",
  "gender",
  "email",
  "mobile",
  "qualification",
  "currentAddress",
  "permanentAddress",
  "idNumber",
  "startTime",
  "endTime",
  "password",
];

function getHourValue(timeStr) {
  if (!timeStr) return 0;
  const [time, modifier] = timeStr.split(" ");
  let [hours] = time.split(":");
  hours = parseInt(hours, 10);
  if (modifier === "PM" && hours !== 12) {
    hours += 12;
  }
  if (modifier === "AM" && hours === 12) {
    hours = 0;
  }
  return hours;
}

function getOccupiedSlots(startTime, endTime) {
  const start = getHourValue(startTime);
  const end = getHourValue(endTime);
  const slots = [];

  if (start === end) {
    for (let i = 0; i < 24; i++) {
      slots.push(i);
    }
  } else if (start < end) {
    for (let i = start; i < end; i++) {
      slots.push(i);
    }
  } else {
    for (let i = start; i < 24; i++) {
      slots.push(i);
    }
    for (let i = 0; i < end; i++) {
      slots.push(i);
    }
  }
  return slots;
}

function hasOverlap(slots1, slots2) {
  const set = new Set(slots1);
  return slots2.some((slot) => set.has(slot));
}

export async function register(req, res) {
  try {
    const body = req.body;

    const missing = REQUIRED_FIELDS.filter((f) => !body[f]);
    if (missing.length) {
      return res
        .status(400)
        .json({ message: `Missing required fields: ${missing.join(", ")}` });
    }

    if (!/^\d{10}$/.test(body.mobile)) {
      return res.status(400).json({ message: "Mobile number must be exactly 10 digits" });
    }

    if (!/^[A-Z0-9]{1,12}$/.test(body.idNumber)) {
      return res.status(400).json({ message: "Aadhar / PAN Number must be alphanumeric, uppercase, and maximum 12 characters" });
    }

    const existing = await User.findOne({ email: body.email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const photo = req.files?.photo?.[0]
      ? `/uploads/${req.files.photo[0].filename}`
      : "";
    const idPhoto = req.files?.idPhoto?.[0]
      ? `/uploads/${req.files.idPhoto[0].filename}`
      : "";

    const startVal = getHourValue(body.startTime);
    const endVal = getHourValue(body.endTime);
    let calculatedHours = endVal - startVal;
    if (calculatedHours < 0) {
      calculatedHours += 24;
    } else if (calculatedHours === 0) {
      calculatedHours = 24;
    }

    const requestedSlots = getOccupiedSlots(body.startTime, body.endTime);

    // Fetch all existing students with active chairs
    const activeStudents = await User.find({
      role: "student",
      chairNumber: { $ne: null },
    });

    // Group active bookings by chairNumber
    const chairAllocations = {};
    for (let c = 1; c <= 300; c++) {
      chairAllocations[c] = [];
    }

    for (const student of activeStudents) {
      if (student.chairNumber >= 1 && student.chairNumber <= 300) {
        const slots = getOccupiedSlots(student.startTime, student.endTime);
        chairAllocations[student.chairNumber].push(slots);
      }
    }

    // Find first chair that has no overlap with the requested slots
    let assignedChair = null;
    for (let c = 1; c <= 300; c++) {
      const existingBookings = chairAllocations[c];
      const hasOverlapOnChair = existingBookings.some((slots) =>
        hasOverlap(slots, requestedSlots)
      );
      if (!hasOverlapOnChair) {
        assignedChair = c;
        break;
      }
    }

    if (!assignedChair) {
      return res
        .status(400)
        .json({ message: "No chair is available for the selected slot" });
    }

    const user = await User.create({
      name: body.name,
      fatherName: body.fatherName,
      gender: body.gender,
      email: body.email,
      mobile: body.mobile,
      qualification: body.qualification,
      currentAddress: body.currentAddress,
      permanentAddress: body.permanentAddress,
      idNumber: body.idNumber,
      startTime: body.startTime,
      endTime: body.endTime,
      hours: calculatedHours,
      chairNumber: assignedChair,
      password: body.password,
      photo,
      idPhoto,
      role: "student",
    });

    const token = signToken(user);
    return res.status(201).json({ token, user });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ message: "Registration failed" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken(user);
    return res.json({ token, user });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "Login failed" });
  }
}

export async function me(req, res) {
  return res.json({ user: req.user });
}
