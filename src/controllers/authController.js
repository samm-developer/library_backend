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
  "hours",
  "password",
];

export async function register(req, res) {
  try {
    const body = req.body;

    const missing = REQUIRED_FIELDS.filter((f) => !body[f]);
    if (missing.length) {
      return res
        .status(400)
        .json({ message: `Missing required fields: ${missing.join(", ")}` });
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
      hours: Number(body.hours),
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
