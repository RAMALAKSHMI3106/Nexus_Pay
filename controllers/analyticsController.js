const db = require("../config/db");

// Promisify the db query for clean async/await
const queryAsync = (sql, args) => {
  return new Promise((resolve, reject) => {
    db.query(sql, args, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

exports.getAnalyticsSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Total spent (Success transactions only)
    const totalSpentResult = await queryAsync(
      "SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND status = 'success'",
      [userId]
    );
    const totalSpent = totalSpentResult[0]?.total || 0;

    // 2. Total transactions
    const totalTxResult = await queryAsync(
      "SELECT COUNT(id) as count FROM transactions WHERE user_id = ?",
      [userId]
    );
    const totalTransactions = totalTxResult[0]?.count || 0;

    // 3. Transactions grouped by category
    const categoryData = await queryAsync(
      "SELECT category, SUM(amount) as amount, COUNT(id) as count FROM transactions WHERE user_id = ? AND status = 'success' GROUP BY category ORDER BY amount DESC",
      [userId]
    );

    // 4. Transactions grouped by date
    const dailyTransactions = await queryAsync(
      "SELECT DATE(created_at) as date, SUM(amount) as amount FROM transactions WHERE user_id = ? AND status = 'success' GROUP BY DATE(created_at) ORDER BY date ASC LIMIT 30",
      [userId]
    );

    // 5. Success vs Failed
    const statusDataRaw = await queryAsync(
      "SELECT status, COUNT(id) as count FROM transactions WHERE user_id = ? GROUP BY status",
      [userId]
    );
    
    let successCount = 0;
    let failedCount  = 0;
    statusDataRaw.forEach(row => {
      if (row.status === 'success') successCount = row.count;
      else failedCount += row.count;
    });

    res.json({
      totalTransactions: parseInt(totalTransactions),
      totalAmount: parseFloat(totalSpent),
      successCount: parseInt(successCount),
      failedCount: parseInt(failedCount),
      categoryBreakdown: categoryData,
      dailyTransactions: dailyTransactions // Using consistent name
    });

  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ error: "Failed to fetch analytics data" });
  }
};
