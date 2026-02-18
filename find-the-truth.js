const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const findTheTruth = async () => {
    try {
        console.log('\n=== 🕵️ Database Finder ===');
        console.log('1. Connecting using MONGO_URI from .env...');

        await mongoose.connect(process.env.MONGO_URI);

        const dbName = mongoose.connection.name;
        const host = mongoose.connection.host;
        const port = mongoose.connection.port;

        console.log('✅ Connected Successfully!');
        console.log('   - Host (เครื่องที่ต่อ):', host);
        console.log('   - Port:', port);
        console.log('   - Database Name (ชื่อฐานข้อมูล):', dbName);
        console.log('   - Collection Name:', User.collection.name);

        // สร้างข้อมูลที่หาได้ง่ายๆ ใน Compass
        const markerEmail = 'HERE_IS_ADMIN@laundrypro.com';
        await User.findOneAndDelete({ email: markerEmail }); // ลบของเก่าถ้ามี

        const marker = new User({
            name: '--- THIS IS THE REAL DATABASE ---',
            email: markerEmail,
            phone: '9999999999',
            password: 'password123',
            role: 'admin'
        });

        await marker.save();

        console.log('\n--- 💡 สิ่งที่คุณต้องทำใน MongoDB Compass ---');
        console.log(`1. ดูที่แถบซ้ายมือ หา Connection ที่เป็น "${host}:${port}" (ปกติคือ localhost:27017)`);
        console.log(`2. เข้าไปที่ Database ชื่อ "${dbName}"`);
        console.log(`3. เข้าไปที่ Collection ชื่อ "${User.collection.name}"`);
        console.log(`4. พิมพ์ Filter ในช่องสีขาว: { "email": "${markerEmail}" } แล้วกด Find`);
        console.log('--- ถ้าเจออันนี้ แปลว่านี่คือ Database ที่ Backend ใช้งานอยู่จริงครับ! ---');

        process.exit(0);
    } catch (err) {
        console.error('\n❌ ERROR:', err.message);
        process.exit(1);
    }
};

findTheTruth();
