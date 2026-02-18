const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const analyzeDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;
        const collection = db.collection('users');

        const allDocs = await collection.find({}).toArray();
        console.log('--- DATABASE ANALYSIS ---');
        console.log('Total documents in "users" collection:', allDocs.length);

        const withPassword = allDocs.filter(d => d.password).length;
        const withPasswordHash = allDocs.filter(d => d.passwordHash).length;
        const adminAccount = allDocs.find(d => d.email === 'admin@laundrypro.com');

        console.log('Documents with "password" field (New System):', withPassword);
        console.log('Documents with "passwordHash" field (Old System):', withPasswordHash);

        if (adminAccount) {
            console.log('✅ admin@laundrypro.com exists in DB!');
            console.log('   - Role:', adminAccount.role);
            console.log('   - CreatedAt:', adminAccount.createdAt);
        } else {
            console.log('❌ admin@laundrypro.com NOT FOUND in this DB.');
        }

        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    }
};

analyzeDB();
