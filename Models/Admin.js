const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    role: {
        type: String,
        default:"Admin"
    },
    firstName: {
        type: String,
        required: [true, 'Please provide Firstname!'],
    },
    lastName: {
        type: String,
        required: [true, 'Please provide Lastname!'],
    },
    
    email: {
        type: String,
        required: [true, 'Please provide Email!'],
        unique: true,
    },
    password: {
        type: String,
        required: [true, 'Please provide Password!'],
    },
});

module.exports = mongoose.model('Admin', AdminSchema);
