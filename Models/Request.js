const mongoose = require("mongoose");

const RequestAmount = new mongoose.Schema({
  email: {
    type: String,
  },
  walletAddress: {
    type: String,
  },
  amount: {
    type: Number,
  },
  balance: {
    type: Number,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  userId: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

module.exports = mongoose.model("RequestWithdrawal", RequestAmount);
