import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { Seat } from "../models/Seat.js";
import { Book } from "../models/Book.js";

const SEAT_COUNT = Number(process.env.SEED_SEATS || 40);

const SAMPLE_BOOKS = [
  {
    title: "Indian Polity",
    author: "M. Laxmikanth",
    category: "Polity",
    purchasePrice: 750,
    rentPricePerDay: 10,
    copiesForRent: 5,
    stockForSale: 10,
  },
  {
    title: "A Brief History of Modern India",
    author: "Spectrum",
    category: "History",
    purchasePrice: 500,
    rentPricePerDay: 8,
    copiesForRent: 4,
    stockForSale: 8,
  },
  {
    title: "Certificate Physical & Human Geography",
    author: "G.C. Leong",
    category: "Geography",
    purchasePrice: 420,
    rentPricePerDay: 7,
    copiesForRent: 3,
    stockForSale: 6,
  },
  {
    title: "Quantitative Aptitude",
    author: "R.S. Aggarwal",
    category: "Aptitude",
    purchasePrice: 650,
    rentPricePerDay: 9,
    copiesForRent: 6,
    stockForSale: 12,
  },
  {
    title: "Word Power Made Easy",
    author: "Norman Lewis",
    category: "English",
    purchasePrice: 300,
    rentPricePerDay: 5,
    copiesForRent: 5,
    stockForSale: 15,
  },
  {
    title: "Lucent's General Knowledge",
    author: "Lucent",
    category: "General Knowledge",
    purchasePrice: 350,
    rentPricePerDay: 6,
    copiesForRent: 4,
    stockForSale: 10,
  },
  {
    title: "Fundamentals of Physics",
    author: "Halliday, Resnick & Walker",
    category: "Science",
    purchasePrice: 900,
    rentPricePerDay: 12,
    copiesForRent: 3,
    stockForSale: 5,
  },
  {
    title: "Concepts of Chemistry",
    author: "O.P. Tandon",
    category: "Science",
    purchasePrice: 700,
    rentPricePerDay: 10,
    copiesForRent: 3,
    stockForSale: 6,
  },
];

async function seedLibrary() {
  await connectDB();

  // Seats
  const existingSeats = await Seat.countDocuments();
  if (existingSeats === 0) {
    const seats = Array.from({ length: SEAT_COUNT }, (_, i) => ({
      seatNumber: i + 1,
      zone: i < SEAT_COUNT / 2 ? "Main Hall" : "Quiet Zone",
    }));
    await Seat.insertMany(seats);
    console.log(`Seeded ${SEAT_COUNT} seats.`);
  } else {
    console.log(`Seats already present (${existingSeats}). Skipping.`);
  }

  // Books
  const existingBooks = await Book.countDocuments();
  if (existingBooks === 0) {
    const docs = SAMPLE_BOOKS.map((b) => ({
      ...b,
      availableForRent: b.copiesForRent,
    }));
    await Book.insertMany(docs);
    console.log(`Seeded ${docs.length} books.`);
  } else {
    console.log(`Books already present (${existingBooks}). Skipping.`);
  }

  await mongoose.disconnect();
}

seedLibrary().catch((err) => {
  console.error("Library seed failed:", err);
  process.exit(1);
});
