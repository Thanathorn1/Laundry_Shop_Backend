const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    services: [{
        type: { type: String, required: true },
        weight: { type: Number },
        price: { type: Number, required: true }
    }],
    totalPrice: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Washing', 'Done', 'Collected'], default: 'Pending' },
    paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
    stripeSessionId: { type: String },
    qrCode: { type: String },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);
