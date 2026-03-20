const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const { verifyToken } = require("../middleware/authMiddleware");

// Protected route to fetch analytics summary for the logged-in user
// Protected routes to fetch analytics
router.get("/", verifyToken, analyticsController.getAnalyticsSummary);
router.get("/summary", verifyToken, analyticsController.getAnalyticsSummary);

module.exports = router;
