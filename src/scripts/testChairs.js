import mongoose from "mongoose";
import { User } from "../models/User.js";
import { connectDB } from "../config/db.js";

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

async function runTest() {
  console.log("Connecting to database...");
  await connectDB();

  // Clear previous test users
  console.log("Cleaning up previous test users...");
  await User.deleteMany({ email: /@test-chairs\.com$/ });

  console.log("\n--- TEST 1: Overlapping bookings assign different chairs ---");
  // User 1: 10:00 AM to 2:00 PM
  const u1 = await User.create({
    name: "User 1",
    fatherName: "Father 1",
    gender: "Male",
    email: "u1@test-chairs.com",
    mobile: "1111111111",
    qualification: "Degree",
    currentAddress: "Add",
    permanentAddress: "Add",
    idNumber: "ID1",
    startTime: "10:00 AM",
    endTime: "2:00 PM",
    hours: 4,
    chairNumber: 1, // manually set first to simulate database state, or let's use the register logic manually
    password: "password123",
  });
  console.log(`User 1 registered for 10am-2pm, Chair: ${u1.chairNumber}`);

  // User 2: 1:00 PM to 6:00 PM (overlaps with User 1)
  const requestedSlotsU2 = getOccupiedSlots("1:00 PM", "6:00 PM");
  const activeStudentsU2 = await User.find({ role: "student", chairNumber: { $ne: null } });
  
  let assignedChairU2 = null;
  const chairAllocationsU2 = {};
  for (let c = 1; c <= 300; c++) chairAllocationsU2[c] = [];
  for (const s of activeStudentsU2) {
    chairAllocationsU2[s.chairNumber].push(getOccupiedSlots(s.startTime, s.endTime));
  }
  for (let c = 1; c <= 300; c++) {
    if (!chairAllocationsU2[c].some(slots => hasOverlap(slots, requestedSlotsU2))) {
      assignedChairU2 = c;
      break;
    }
  }
  
  const u2 = await User.create({
    name: "User 2",
    fatherName: "Father 2",
    gender: "Male",
    email: "u2@test-chairs.com",
    mobile: "2222222222",
    qualification: "Degree",
    currentAddress: "Add",
    permanentAddress: "Add",
    idNumber: "ID2",
    startTime: "1:00 PM",
    endTime: "6:00 PM",
    hours: 5,
    chairNumber: assignedChairU2,
    password: "password123",
  });
  console.log(`User 2 registered for 1pm-6pm (overlaps), Chair: ${u2.chairNumber}`);

  console.log("\n--- TEST 2: Non-overlapping booking reuses Chair 1 ---");
  // User 3: 3:00 PM to 9:00 PM (overlaps with User 2, but NOT User 1)
  const requestedSlotsU3 = getOccupiedSlots("3:00 PM", "9:00 PM");
  const activeStudentsU3 = await User.find({ role: "student", chairNumber: { $ne: null } });
  
  let assignedChairU3 = null;
  const chairAllocationsU3 = {};
  for (let c = 1; c <= 300; c++) chairAllocationsU3[c] = [];
  for (const s of activeStudentsU3) {
    chairAllocationsU3[s.chairNumber].push(getOccupiedSlots(s.startTime, s.endTime));
  }
  for (let c = 1; c <= 300; c++) {
    if (!chairAllocationsU3[c].some(slots => hasOverlap(slots, requestedSlotsU3))) {
      assignedChairU3 = c;
      break;
    }
  }

  const u3 = await User.create({
    name: "User 3",
    fatherName: "Father 3",
    gender: "Male",
    email: "u3@test-chairs.com",
    mobile: "3333333333",
    qualification: "Degree",
    currentAddress: "Add",
    permanentAddress: "Add",
    idNumber: "ID3",
    startTime: "3:00 PM",
    endTime: "9:00 PM",
    hours: 6,
    chairNumber: assignedChairU3,
    password: "password123",
  });
  console.log(`User 3 registered for 3pm-9pm, Chair: ${u3.chairNumber} (expected: 1)`);

  console.log("\n--- TEST 3: Limit booking exhaustion ---");
  console.log("Generating 298 more overlapping users to fill all 300 seats...");
  
  // Create 298 overlapping users for "10:00 AM" to "2:00 PM"
  // Since User 1 and User 2 occupy Chair 1 and Chair 2, we will create users 3 to 300.
  const bulkUsers = [];
  for (let i = 4; i <= 301; i++) {
    bulkUsers.push({
      name: `Exhaustion User ${i}`,
      fatherName: "Father",
      gender: "Other",
      email: `ex${i}@test-chairs.com`,
      mobile: "1234567890",
      qualification: "Degree",
      currentAddress: "Add",
      permanentAddress: "Add",
      idNumber: `EXID${i}`,
      startTime: "10:00 AM",
      endTime: "2:00 PM",
      hours: 4,
      chairNumber: i - 1, // seat numbers 3 to 300
      password: "password123",
    });
  }
  await User.insertMany(bulkUsers);
  console.log("Filled chairs up to 300.");

  // Now verify that trying to find an available chair for overlapping slot "10:00 AM" to "2:00 PM" returns null
  const testSlot = getOccupiedSlots("10:00 AM", "2:00 PM");
  const allActives = await User.find({ role: "student", chairNumber: { $ne: null } });
  
  let finalChair = null;
  const finalAllocations = {};
  for (let c = 1; c <= 300; c++) finalAllocations[c] = [];
  for (const s of allActives) {
    finalAllocations[s.chairNumber].push(getOccupiedSlots(s.startTime, s.endTime));
  }
  for (let c = 1; c <= 300; c++) {
    if (!finalAllocations[c].some(slots => hasOverlap(slots, testSlot))) {
      finalChair = c;
      break;
    }
  }

  console.log(`Availability of chair for 10am-2pm slot: ${finalChair ? `Chair ${finalChair}` : "None available (expected)"}`);

  // Clean up
  console.log("\nCleaning up test users...");
  await User.deleteMany({ email: /@test-chairs\.com$/ });

  await mongoose.disconnect();
  console.log("Done.");
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
