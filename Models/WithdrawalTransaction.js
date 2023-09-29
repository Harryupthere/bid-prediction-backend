const mongoose = require('mongoose');

const WithdrawalTransaction = new mongoose.Schema({
    amount: {
        type: Number,
    },
    walletAddress: {
        type: String,
      },
    transType: {
        type: String, 
    },
    transStatus: {
        type: String, 
    },
    date: {
        type: Date,
        default: Date.now, 
    },
    userId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

module.exports = mongoose.model('UserWithdrawal', WithdrawalTransaction);
