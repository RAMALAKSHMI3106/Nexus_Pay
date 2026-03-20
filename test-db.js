const db = require('./config/db');

db.query("DESCRIBE transactions", (err, results) => {
    if (err) {
        console.error(err);
    } else {
        console.log("Transactions Schema:");
        console.log(results);
    }
    
    // Check if there's any merchant data table to join with for category
    db.query("SHOW TABLES", (err, tables) => {
        if (!err) console.log("Tables:", tables);
        process.exit();
    });
});
