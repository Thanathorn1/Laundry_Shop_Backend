const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const verifyConnection = async () => {
    try {
        console.log('--- Database Verification ---');
        console.log('Using MONGO_URI:', process.env.MONGO_URI.replace(/:([^@]+)@/, ':****@'));

        await mongoose.connect(process.env.MONGO_URI);
        const dbName = mongoose.connection.name;
        console.log('Connected to Database Name:', dbName);

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections in this database:', collections.map(c => c.name));

        if (collections.find(c => c.name === 'users')) {
            const usersCount = await mongoose.connection.db.collection('users').countDocuments();
            console.log('Total documents in "users":', usersCount);

            const admin = await mongoose.connection.db.collection('users').findOne({ email: 'admin@laundrypro.com' });
            if (admin) {
                console.log('✅ Found admin@laundrypro.com in DB:', dbName);
                console.log('   Fields found:', Object.keys(admin));
            } else {
                console.log('❌ admin@laundrypro.com NOT found in collection "users" of database:', dbName);
            }
        } else {
            console.log('❌ Collection "users" does not exist in this database.');
        }

        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    }
};

verifyConnection();
