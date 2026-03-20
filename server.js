const express = require("express");
const path = require("path");
require("dotenv").config();
const cors = require("cors");

const app = express();

// Enable CORS **before routes**

app.use(cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend files
app.use(express.static(path.join(__dirname, "frontend")));

// ── Startup DB migration: add columns if missing ──
const db = require("./config/db");
const migrations = [
  "ALTER TABLE transactions ADD COLUMN recipient_account VARCHAR(100) NULL",
  "ALTER TABLE transactions ADD COLUMN purpose VARCHAR(50) NULL",
  "ALTER TABLE bank_cards ADD COLUMN used_amount DECIMAL(10,2) DEFAULT 0.00"
];
migrations.forEach(sql => db.query(sql, err => {
  if (err && err.code !== "ER_DUP_FIELDNAME" && !err.message.includes("Duplicate column")) {
    console.warn("Migration note:", err.message);
  }
}));


// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/cards", require("./routes/cardRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));

// SPI Routes for specific Task
const { verifyToken } = require("./middleware/authMiddleware");
const cardController = require("./controllers/cardController");
const paymentController = require("./controllers/paymentController");
app.get("/api/user/cards", verifyToken, cardController.getCardsSPI);
app.post("/api/transaction", verifyToken, paymentController.processTransactionSPI);

app.get("/api/debug-ping", (req, res) => res.json({ message: "pong" }));
app.use("/api/analytics", require("./routes/analyticsRoutes"));

// Test token endpoint
app.get("/test-token", (req, res) => {
  const jwt = require("jsonwebtoken");

  const token = jwt.sign(
    { id: 1, email: "priya@gmail.com" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({ token });
});

const PORT = process.env.PORT;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
