import crypto from "crypto";

const phonepeMerchantId = "PGBARCHAND";
const phonepeSaltKey = "099eb0cd-02cf-4e2a-8aca-3e6c6aff0399";
const phonepeSaltIndex = "1";

const payload = {
  merchantId: phonepeMerchantId,
  merchantTransactionId: "TEST-TXN-123456",
  merchantUserId: "TEST-USER-123",
  amount: 200 * 100, // ₹200 in paise
  redirectUrl: "http://localhost:4000/api/fees/phonepe/redirect",
  redirectMode: "POST",
  callbackUrl: "http://localhost:4000/api/fees/phonepe/callback",
  paymentInstrument: {
    type: "PAY_PAGE",
  },
};

const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
const stringToSign = base64Payload + "/pg/v1/pay" + phonepeSaltKey;
const sha256Value = crypto.createHash("sha256").update(stringToSign).digest("hex");
const xVerifyHeader = `${sha256Value}###${phonepeSaltIndex}`;

console.log("PhonePe checksum generation test:");
console.log("  Base64 Payload length:", base64Payload.length);
console.log("  Checksum (SHA256):", sha256Value);
console.log("  X-VERIFY Header:", xVerifyHeader);

if (xVerifyHeader.endsWith("###1") && sha256Value.length === 64) {
  console.log("Test passed!");
} else {
  console.error("Test failed!");
  process.exit(1);
}
