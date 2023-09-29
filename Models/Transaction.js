const mongoose = require('mongoose');

const BetTransactionSchema = new mongoose.Schema({
    prediction: {
        type: String,
    },
    amount: {
        type: Number,
    },
    result: {
        type: String,
    },
    duration: {
        type: String,
    },
    profit: {
        type: String,
    },
    date: {
        type: Date,
        default: Date.now, 
    },
    userId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

module.exports = mongoose.model('BetTransaction', BetTransactionSchema);
