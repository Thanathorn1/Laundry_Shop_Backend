const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    openHours: { type: String, required: true },
    image: { type: String },
    location: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
    },
    machines: [
        {
            id: { type: String, required: true },
            type: { type: String, enum: ['washer', 'dryer'], required: true },
            status: { type: String, enum: ['available', 'busy', 'out-of-order'], default: 'available' },
        }
    ],
    pricing: {
        wash: { type: Number, default: 40 },
        dry: { type: Number, default: 40 },
        iron: { type: Number, default: 20 },
        duvet: { type: Number, default: 100 },
        express_extra: { type: Number, default: 50 },
    },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Shop', shopSchema);
