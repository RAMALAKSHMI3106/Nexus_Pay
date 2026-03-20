const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

exports.processPayment = (req, res) => {
  const { bank_card_id, amount, category } = req.body;
  const userId = req.user.id;

  // 1️⃣ Check card details
  db.query(
    "SELECT * FROM bank_cards WHERE id = ?",
    [bank_card_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: "Database error" });

      if (results.length === 0)
        return res.status(400).json({ error: "Card not found" });

      const card = results[0];

      // 2️⃣ Check if card is active
      if (card.status !== "active")
        return res.status(400).json({ error: "Card is blocked" });

      // 3️⃣ Check available balance
      if (card.available_balance < amount)
        return res.status(400).json({ error: "Insufficient balance" });

      // 4️⃣ Update used_amount and recalculate available_balance
      const flAmount = parseFloat(amount);
      const limit = parseFloat(card.credit_limit || 100000);
      const oldUsed = parseFloat(card.used_amount || 0);
      const newUsed = oldUsed + flAmount;
      const newBalance = limit - newUsed;

      db.query(
        "UPDATE bank_cards SET used_amount = ?, available_balance = ? WHERE id = ?",
        [newUsed, newBalance, bank_card_id],
        (err) => {
          if (err)
            return res.status(500).json({ error: "Failed to update balance" });

          // 5️⃣ Insert transaction
          db.query(
            "INSERT INTO transactions (transaction_id, user_id, merchant_id, amount, status, category, bank_card_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [uuidv4(), userId, 1, amount, "success", category || "General", bank_card_id],
            (err) => {
              if (err)
                return res.status(500).json({ error: "Transaction failed" });

              res.json({
                message: "Payment successful",
                remaining_balance: newBalance,
              });
            }
          );
        }
      );
    }
  );
};
exports.getTransactionHistory = (req, res) => {
  const userId = req.user.id;

  db.query(
    "SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC",
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: "Database error" });

      res.json(results);
    }
  );
};

// SPI: Process transaction — verifies MPIN, logs recipient + purpose
const bcrypt = require("bcrypt");

exports.processTransactionSPI = (req, res) => {
  const { cardId, amount, recipientAccount, purpose, mpin } = req.body;
  const userId = req.user.id;

  // ── Validate required fields ──
  if (!cardId || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return res.status(400).json({ success: false, message: "Invalid card or amount." });
  }
  if (!mpin || !/^\d{4,6}$/.test(mpin)) {
    return res.status(400).json({ success: false, message: "MPIN must be 4–6 numeric digits." });
  }

  const flAmount = parseFloat(amount);

  // ── Step 1: Verify MPIN against the user's stored bcrypt hash ──
  db.query(
    "SELECT mpin FROM users WHERE id = ?",
    [userId],
    async (err, userRows) => {
      if (err) return res.status(500).json({ success: false, message: "Database error checking MPIN." });
      if (!userRows.length) return res.status(404).json({ success: false, message: "User not found." });

      const user = userRows[0];
      if (!user.mpin) {
        return res.status(400).json({ success: false, message: "MPIN not set. Please set your MPIN in Settings." });
      }

      const mpinMatch = await bcrypt.compare(mpin, user.mpin);
      if (!mpinMatch) {
        return res.status(401).json({ success: false, message: "Incorrect MPIN. Please try again." });
      }

      // ── Step 2: Validate card belongs to user ──
      db.query(
        "SELECT * FROM bank_cards WHERE id = ? AND user_id = ?",
        [cardId, userId],
        (err, cardRows) => {
          if (err) return res.status(500).json({ success: false, message: "Database error." });
          if (!cardRows.length) return res.status(404).json({ success: false, message: "Card not found." });

          const card = cardRows[0];
          if (card.status !== "active") {
            return res.status(400).json({ success: false, message: "Card is inactive or blocked." });
          }

          const limit = parseFloat(card.credit_limit || 100000);
          const oldUsed = parseFloat(card.used_amount || 0);
          
          if (limit - oldUsed < flAmount) {
            return res.status(400).json({ success: false, message: "Insufficient balance." });
          }

          const newUsed = oldUsed + flAmount;
          const newBalance = limit - newUsed;

          // ── Step 3: Update used_amount and available_balance ──
          db.query(
            "UPDATE bank_cards SET used_amount = ?, available_balance = ? WHERE id = ?",
            [newUsed, newBalance, cardId],
            (err) => {
              if (err) return res.status(500).json({ success: false, message: "Failed to update balance." });

              // ── Step 4: Log transaction (try with extra columns, fall back gracefully) ──
              const txId = uuidv4();
              const cat  = purpose || "General";
              const rcpt = recipientAccount || null;

              const insertQuery = `
                INSERT INTO transactions
                  (transaction_id, user_id, amount, status, category, bank_card_id, recipient_account)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `;
              db.query(
                insertQuery,
                [txId, userId, flAmount, "success", cat, cardId, rcpt],
                (err) => {
                  if (err) {
                    // Columns might not exist yet — fall back to minimal insert
                    db.query(
                      "INSERT INTO transactions (transaction_id, user_id, amount, status, category, bank_card_id) VALUES (?, ?, ?, ?, ?, ?)",
                      [txId, userId, flAmount, "success", cat, cardId],
                      (err2) => { if (err2) console.error("Transaction log fallback error:", err2); }
                    );
                  }
                  res.json({
                    success: true,
                    message: "Transaction successful",
                    updatedBalance: newBalance
                  });
                }
              );
            }
          );
        }
      );
    }
  );
};