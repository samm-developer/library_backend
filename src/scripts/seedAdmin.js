import mongoose from "mongoose";
import { config } from "../config/env.js";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";

async function seedAdmin() {
  await connectDB();

  const existing = await User.findOne({ email: config.adminEmail.toLowerCase() });
  if (existing) {
    console.log(`Admin already exists: ${config.adminEmail}`);
    await mongoose.disconnect();
    return;
  }

  await User.create({
    name: "Administrator",
    fatherName: "N/A",
    gender: "Other",
    email: config.adminEmail,
    mobile: "0000000000",
    qualification: "N/A",
    currentAddress: "N/A",
    permanentAddress: "N/A",
    idNumber: "ADMIN",
    hours: 1,
    password: config.adminPassword,
    role: "admin",
  });

  console.log("Admin created:");
  console.log(`  email:    ${config.adminEmail}`);
  console.log(`  password: ${config.adminPassword}`);

  await mongoose.disconnect();
}

seedAdmin().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
