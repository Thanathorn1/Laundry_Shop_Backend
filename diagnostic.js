const dotenv = require('dotenv');
const mongoose = require('mongoose');
dotenv.config();

console.log('--- Environment Check ---');
console.log('PORT:', process.env.PORT);
console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
if (process.env.MONGO_URI) {
    console.log('MONGO_URI starts with:', process.env.MONGO_URI.substring(0, 20) + '...');
}
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('------------------------');

if (!process.env.MONGO_URI) {
    console.error('ERROR: MONGO_URI is missing!');
    process.exit(1);
}

console.log('Attempting to connect to MongoDB (timeout in 5s)...');
mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
        console.log('SUCCESS: MongoDB Connected!');
        process.exit(0);
    })
    .catch(err => {
        console.error('FAILURE: Could not connect to MongoDB:', err.message);
        process.exit(1);
    });
