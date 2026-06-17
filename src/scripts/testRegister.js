import mongoose from "mongoose";
import { User } from "../models/User.js";
import { connectDB } from "../config/db.js";

async function runTest() {
  console.log("Connecting to DB...");
  await connectDB();

  const testEmail = "test_timings_user@example.com";
  // Clean up any old test user
  await User.deleteOne({ email: testEmail });

  console.log("Creating test user with 9:00 AM to 5:00 PM...");

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

  const startTime = "9:00 AM";
  const endTime = "5:00 PM";
  const startVal = getHourValue(startTime);
  const endVal = getHourValue(endTime);
  let calculatedHours = endVal - startVal;
  if (calculatedHours < 0) {
    calculatedHours += 24;
  } else if (calculatedHours === 0) {
    calculatedHours = 24;
  }

  const user = await User.create({
    name: "Test Timings User",
    fatherName: "Test Father",
    gender: "Male",
    email: testEmail,
    mobile: "1234567890",
    qualification: "Degree",
    currentAddress: "123 Test Rd",
    permanentAddress: "123 Test Rd",
    idNumber: "1234567890",
    startTime,
    endTime,
    hours: calculatedHours,
    password: "password123",
  });

  console.log("User created successfully:");
  console.log("  Name:", user.name);
  console.log("  Hours:", user.hours);
  console.log("  StartTime:", user.startTime);
  console.log("  EndTime:", user.endTime);

  // Clean up
  await User.deleteOne({ email: testEmail });
  console.log("Cleaned up test user.");

  await mongoose.disconnect();
  console.log("Disconnected.");
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
