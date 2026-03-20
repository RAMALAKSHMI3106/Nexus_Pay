const db = require('./config/db');

async function setupAnalyticsDb() {
  try {
    console.log("Adding 'category' column to 'transactions' table...");
    await new Promise((resolve, reject) => {
      // Check if column exists first
      db.query("SHOW COLUMNS FROM transactions LIKE 'category'", (err, results) => {
        if (err) return reject(err);
        if (results.length > 0) {
          console.log("Column 'category' already exists.");
          return resolve();
        }

        // Add column
        db.query("ALTER TABLE transactions ADD COLUMN category VARCHAR(50) DEFAULT 'General'", (err) => {
          if (err) return reject(err);
          console.log("Column 'category' added successfully.");
          resolve();
        });
      });
    });

    console.log("Ensuring we have some mock transactions for analytics...");
    const categories = ['Shopping', 'Food & Dining', 'Travel', 'Entertainment', 'Bills & Utilities', 'Groceries'];
    const statuses = ['success', 'success', 'success', 'pending', 'failed']; // Weighted towards success
    
    // We'll insert some dummy transactions for user 1 if they don't have enough
    await new Promise((resolve, reject) => {
      db.query("SELECT COUNT(*) as count FROM transactions WHERE user_id = 1", (err, results) => {
        if (err) return reject(err);
        const currentCount = results[0].count;
        
        if (currentCount > 10) {
          console.log(`User 1 already has ${currentCount} transactions. Assigning random categories to existing ones...`);
          
          db.query("SELECT id FROM transactions WHERE category = 'General'", (err, txs) => {
            if (err) return reject(err);
            if (txs.length === 0) return resolve();
            
            let completed = 0;
            for (const tx of txs) {
              const randomCategory = categories[Math.floor(Math.random() * categories.length)];
              db.query("UPDATE transactions SET category = ? WHERE id = ?", [randomCategory, tx.id], (updErr) => {
                completed++;
                if (completed === txs.length) resolve();
              });
            }
            if (txs.length === 0) resolve();
          });
        } else {
          console.log("Inserting 15 mock transactions for user 1...");
          const { v4: uuidv4 } = require('uuid');
          let completed = 0;
          for (let i = 0; i < 15; i++) {
            const randomCategory = categories[Math.floor(Math.random() * categories.length)];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            const randomAmount = (Math.random() * 5000 + 100).toFixed(2); // ₹100 to ₹5100
            
            // Generate random date within last 30 days
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 30));
            const dateStr = date.toISOString().slice(0, 19).replace('T', ' ');

            db.query(
              "INSERT INTO transactions (transaction_id, user_id, merchant_id, amount, status, category, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
              [uuidv4(), 1, 1, randomAmount, randomStatus, randomCategory, dateStr],
              (err) => {
                if (err) console.error("Error inserting transaction:", err);
                completed++;
                if (completed === 15) resolve();
              }
            );
          }
        }
      });
    });

    console.log("Database setup complete!");
  } catch (err) {
    console.error("An error occurred:", err);
  } finally {
    process.exit();
  }
}

setupAnalyticsDb();
