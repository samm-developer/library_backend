import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    fatherName: { type: String, required: true, trim: true },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobile: { type: String, required: true, trim: true },
    qualification: { type: String, required: true, trim: true },
    currentAddress: { type: String, required: true, trim: true },
    permanentAddress: { type: String, required: true, trim: true },
    // Aadhar Number or PAN Number
    idNumber: { type: String, required: true, trim: true },
    // Relative paths to uploaded files (served from /uploads)
    photo: { type: String, default: "" },
    idPhoto: { type: String, default: "" },
    // Daily study hours selected at registration (drives the fee)
    hours: { type: Number, required: true, min: 1 },

    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ["student", "admin"], default: "student" },

    // Until when the student's fee is considered paid (null = never paid)
    paidUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexes for high-traffic lookups (login, defaulter scans, role filters).
// (email already has a unique index via `unique: true` on the field.)
userSchema.index({ role: 1 });
userSchema.index({ paidUntil: 1 });
userSchema.index({ mobile: 1 });

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.password;
    return ret;
  },
});

export const User = mongoose.model("User", userSchema);
