const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

exports.addCard = (req, res) => {
  const userId = req.user.id;
  const { cardNumber, expiry } = req.body;

  // 1️⃣ Tokenize card (store last 4 digits)
  const lastFour = cardNumber.slice(-4);
  const cardToken = uuidv4(); // simple token for now

  // 2️⃣ Insert into bank_cards
  const sql = `
    INSERT INTO bank_cards (card_holder, expiry, status, available_balance, credit_limit, used_amount, card_token, last_four, user_id)
    VALUES (?, ?, 'active', 100000, 100000, 0, ?, ?, ?)
  `;
  const values = ["Priya Sharma", expiry, cardToken, lastFour, userId];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: "Failed to add card" });

    res.json({
      message: "Card added successfully",
      card: {
        id: result.insertId,
        last_four: lastFour,
        card_token: cardToken,
        available_balance: 100000,
        credit_limit: 100000,
        used_amount: 0
      },
    });
  });
};

// Optional: Get user cards
exports.getUserCards = (req, res) => {
  const userId = req.user.id;

  db.query(
    "SELECT id, last_four, available_balance, credit_limit, used_amount, status, card_type, expiry, card_holder FROM bank_cards WHERE user_id = ?",
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: "Database error" });

      res.json(results);
    }
  );
};

// SPI: Get cards in specific user format
exports.getCardsSPI = (req, res) => {
  const userId = req.user.id;
  db.query(
    "SELECT id, card_holder, card_type, last_four, expiry, available_balance, credit_limit, used_amount FROM bank_cards WHERE user_id = ?",
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: "Database error" });
      
      const mappedResults = results.map(card => ({
        cardId: card.id.toString(),
        cardHolder: card.card_holder,
        cardType: (card.card_type || 'Visa').charAt(0).toUpperCase() + (card.card_type || 'visa').slice(1),
        last4: card.last_four,
        expiry: card.expiry,
        balance: parseFloat(card.available_balance),
        limit: parseFloat(card.credit_limit || 0),
        used: parseFloat(card.used_amount || 0)
      }));
      
      res.json(mappedResults);
    }
  );
};