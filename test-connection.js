const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// ลองโหลด .env จากโฟลเดอร์ปัจจุบัน
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

console.log('--- MongoDB Connection Test ---');
console.log('Environment file path:', envPath);

const uri = process.env.MONGO_URI;

if (!uri) {
    console.error('ERROR: MONGO_URI is not defined in .env');
    process.exit(1);
}

// Mask password for security
const maskedUri = uri.replace(/:([^@]+)@/, ':****@');
console.log('Attempting to connect to:', maskedUri);

mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
        console.log('✅ SUCCESS: Connected to MongoDB successfully!');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ FAILURE: Connection failed.');
        console.error('Error Code:', err.code);
        console.error('Error Name:', err.name);
        console.error('Error Message:', err.message);

        if (err.message.includes('authentication failed')) {
            console.log('\n--- คำแนะนำ ---');
            console.log('1. ตรวจสอบว่า Username (Laundry_Shop_DB) ใน .env ตรงกับที่ตั้งไว้ใน Atlas');
            console.log('2. ตรวจสอบว่า Password ถูกต้อง');
            console.log('3. ไปที่ MongoDB Atlas -> Network Access แล้วดูว่าเพิ่ม IP 0.0.0.0/0 (Allow access from anywhere) หรือยัง');
        }
        process.exit(1);
    });
