// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

// Helper: Validate email
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// REGISTER USER
router.post("/register", async (req, res) => {
    const {
        first_name,
        last_name,
        email,
        password,
        mpin,
        phone,
        business_name,
        business_type,
        country,
        currency
    } = req.body;

    // Basic validation
    if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
    }
    if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Invalid email format" });
    }
    if (mpin && !/^\d{4,6}$/.test(mpin)) {
        return res.status(400).json({ message: "MPIN must be 4-6 digits" });
    }

    try {
        // Check if user exists
        db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
            if (err) return res.status(500).json({ message: "Database error" });
            if (result.length > 0) return res.status(400).json({ message: "User already exists" });

            // Hash password and MPIN
            const hashedPassword = await bcrypt.hash(password, 10);
            const hashedMpin = mpin ? await bcrypt.hash(mpin, 10):null;

            // Insert user
            db.query(
                `INSERT INTO users 
                (first_name, last_name, email, password, mpin, phone, business_name, business_type, country, currency)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    first_name || null,
                    last_name || null,
                    email,
                    hashedPassword,
                    hashedMpin,
                    phone || null,
                    business_name || null,
                    business_type || null,
                    country || null,
                    currency || null
                ],
                (err2, result2) => {
                    if (err2) return res.status(500).json({ message: "Database error" });
                    res.json({ message: "User registered successfully" });
                }
            );
        });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// LOGIN USER
router.post("/login", async (req, res) => {
    const { email, password, mpin, method } = req.body;

    if (!email || (!password && !mpin)) {
        return res.status(400).json({ message: "All fields required" });
    }
    if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Invalid email format" });
    }

    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (results.length === 0) return res.status(400).json({ message: "User not found" });

        const user = results[0];

        try {
            if (method === "mpin") {
                if (!user.mpin) return res.status(401).json({ message: "MPIN not set for this user" });
                const mpinMatch = await bcrypt.compare(mpin, user.mpin);
                if (!mpinMatch) return res.status(401).json({ message: "Incorrect MPIN" });
            } else {
                const passwordMatch = await bcrypt.compare(password, user.password);
                if (!passwordMatch) return res.status(401).json({ message: "Incorrect password" });
            }

            // Generate JWT token
            const token = jwt.sign(
                { id: user.id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
            );

            res.json({
                message: "Login successful",
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    phone: user.phone,
                    salary: user.salary
                }
            });
        } catch (err) {
            res.status(500).json({ message: "Server error" });
        }
    });
});

// GET CURRENT USER PROFILE
router.get("/me", require("../middleware/authMiddleware").verifyToken, (req, res) => {
    const userId = req.user.id;
    db.query("SELECT id, first_name, last_name, email, phone, business_name, salary FROM users WHERE id = ?", [userId], (err, results) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (results.length === 0) return res.status(404).json({ message: "User not found" });
        res.json(results[0]);
    });
});

// UPDATE USER SALARY
router.put("/salary", require("../middleware/authMiddleware").verifyToken, (req, res) => {
    const userId = req.user.id;
    const { salary } = req.body;

    console.log(`Updating salary for userId: ${userId} to ${salary}`);

    if (!salary || isNaN(salary)) {
        console.log(`Invalid salary provided: ${salary}`);
        return res.status(400).json({ message: "Valid salary is required" });
    }

    db.query("UPDATE users SET salary = ? WHERE id = ?", [salary, userId], (err, results) => {
        if (err) return res.status(500).json({ message: "Database error" });

        // Recalculate limits and balances for all cards
        const newLimit = salary * 3;
        
        // Find all cards for this user
        db.query("SELECT id FROM bank_cards WHERE user_id = ?", [userId], (err2, cards) => {
            if (err2 || cards.length === 0) {
                return res.json({ message: "Salary updated successfully", salary });
            }

            let completed = 0;
            cards.forEach(card => {
                // Get successful transactions for this card
                db.query(
                    "SELECT SUM(amount) as used FROM transactions WHERE bank_card_id = ? AND status IN ('success', 'completed')",
                    [card.id],
                    (err3, txResult) => {
                        const used = txResult[0].used || 0;
                        const newAvailable = newLimit - used;

                        // Update the card
                        db.query(
                            "UPDATE bank_cards SET credit_limit = ?, used_amount = ?, available_balance = ? WHERE id = ?",
                            [newLimit, used, newAvailable, card.id],
                            () => {
                                completed++;
                                if (completed === cards.length) {
                                    res.json({ message: "Salary and card limits updated successfully", salary, newLimit });
                                }
                            }
                        );
                    }
                );
            });
        });
    });
});

// VERIFY MPIN
router.post("/verify-mpin", require("../middleware/authMiddleware").verifyToken, (req, res) => {
    const userId = req.user.id;
    const { mpin } = req.body;

    if (!mpin) {
        return res.status(400).json({ message: "MPIN is required" });
    }

    db.query("SELECT mpin FROM users WHERE id = ?", [userId], async (err, results) => {
        if (err || results.length === 0) return res.status(500).json({ message: "Database error" });

        const user = results[0];
        if (!user.mpin) return res.status(400).json({ message: "MPIN not set" });

        const match = await bcrypt.compare(mpin, user.mpin);
        if (!match) {
            return res.status(401).json({ message: "Incorrect MPIN. Try again." });
        }

        res.json({ success: true, message: "MPIN verified" });
    });
});

module.exports = router;