const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader)
    return res.status(401).json({ error: "Access denied. No token." });

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // 🔥 THIS LINE IS IMPORTANT

    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
};


module.exports = { verifyToken };