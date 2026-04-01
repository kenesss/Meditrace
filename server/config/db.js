const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URL).then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((e) => {
    console.log("Failed to connect to MongoDB");
  });
