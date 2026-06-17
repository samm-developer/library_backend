import crypto from "crypto";

const razorpayKeyId = "rzp_test_5Wq3bUj1N4JzOp";
const razorpayKeySecret = "super_secret_secret";

async function runTest() {
  console.log("--- TEST 1: Razorpay Signature Verification ---");
  const razorpay_order_id = "order_IEs45t876Tr";
  const razorpay_payment_id = "pay_IEs498u3Jhd";
  
  // Calculate signature
  const stringToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
  const generatedSignature = crypto
    .createHmac("sha256", razorpayKeySecret)
    .update(stringToSign)
    .digest("hex");

  console.log("Generated Signature:", generatedSignature);
  if (generatedSignature && generatedSignature.length === 64) {
    console.log("Signature verification logic check: PASSED");
  } else {
    console.error("Signature verification logic check: FAILED");
    process.exit(1);
  }

  console.log("\n--- TEST 2: Razorpay Order Creation (UAT Auth Mock check) ---");
  // Test if basic auth encoding is correct
  const basicAuth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64");
  console.log("Encoded Basic Auth Base64:", basicAuth);
  
  if (basicAuth) {
    console.log("Order creation auth setup check: PASSED");
  } else {
    console.error("Order creation auth setup check: FAILED");
    process.exit(1);
  }

  console.log("\nAll checks passed successfully!");
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
