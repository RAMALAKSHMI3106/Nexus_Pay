const bcrypt = require("bcrypt");

const password = "PriyaPassword123"; // choose your new password

bcrypt.hash(password, 10, (err, hash) => {
  if (err) throw err;
  console.log("Hashed password:", hash);
});