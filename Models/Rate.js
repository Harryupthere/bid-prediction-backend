const mongoose = require("mongoose");

const Rate = new mongoose.Schema({
  rate: {
    type: Number,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Rate", Rate);
