const express = require("express");
const router = express.Router();
const cardController = require("../controllers/cardController");
const { verifyToken } = require("../middleware/authMiddleware");

// Add a new card
router.post("/add", verifyToken, cardController.addCard);

// Optionally: list user cards
router.get("/", verifyToken, cardController.getUserCards);

module.exports = router;