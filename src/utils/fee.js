import { config } from "../config/env.js";

export function monthlyFee(hours) {
  return Number(hours) * config.feePerHour;
}

// Returns fee status for a student based on paidUntil.
export function feeStatus(user, now = new Date()) {
  const amountDue = monthlyFee(user.hours);
  const paidUntil = user.paidUntil ? new Date(user.paidUntil) : null;
  const isPaid = paidUntil ? paidUntil.getTime() >= now.getTime() : false;

  return {
    hours: user.hours,
    feePerHour: config.feePerHour,
    amountDue,
    paidUntil,
    isPaid,
    isDefaulter: !isPaid,
    periodDays: config.paidPeriodDays,
  };
}
