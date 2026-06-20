import mongoose from "mongoose";

// Errors that indicate the deployment doesn't support multi-doc transactions
// (e.g. a standalone local mongod instead of a replica set / Atlas).
function isUnsupportedTxnError(err) {
  const msg = err?.message || "";
  return (
    err?.code === 20 ||
    /Transaction numbers are only allowed/i.test(msg) ||
    /replica set member or mongos/i.test(msg) ||
    /does not support sessions/i.test(msg) ||
    /Transactions are not supported/i.test(msg)
  );
}

/**
 * Runs `work(session)` inside a MongoDB transaction with automatic
 * commit on success and rollback (abort) on any error.
 *
 * If the underlying deployment doesn't support transactions, it gracefully
 * retries the same `work` without a session so local standalone mongo works.
 * Callers must therefore make `work` safe to run with `session` possibly null.
 */
export async function withTransaction(work) {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await work(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    if (session?.inTransaction()) {
      // Roll back all writes made during the transaction.
      await session.abortTransaction().catch(() => {});
    }
    if (isUnsupportedTxnError(err)) {
      // Fallback path: no transactional guarantees, but keeps app usable.
      return work(null);
    }
    throw err;
  } finally {
    if (session) await session.endSession();
  }
}
