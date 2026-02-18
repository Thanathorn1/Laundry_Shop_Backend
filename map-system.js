const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

const uri = process.env.MONGO_URI;

async function mapTheSystem() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        console.log('\n=== 🛰️ System Mapping ===');
        console.log('Connected to:', uri.replace(/:([^@]+)@/, ':****@'));

        const adminDb = client.db().admin();
        const dbs = await adminDb.listDatabases();

        console.log('\nList of all databases on this server:');
        console.log('-------------------------------------------');

        for (const dbInfo of dbs.databases) {
            const dbName = dbInfo.name;
            const db = client.db(dbName);

            // ตรวจสอบว่ามี collection users ไหม
            const collections = await db.listCollections({ name: 'users' }).toArray();
            let userCount = 0;
            let hasMarker = false;

            if (collections.length > 0) {
                userCount = await db.collection('users').countDocuments();
                const marker = await db.collection('users').findOne({ email: 'HERE_IS_ADMIN@laundrypro.com' });
                if (marker) hasMarker = true;
            }

            console.log(`DB: "${dbName}" | Users: ${userCount} ${hasMarker ? '✅ (FOUND MARKER HERE)' : ''}`);
        }
        console.log('-------------------------------------------');

        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    } finally {
        await client.close();
    }
}

mapTheSystem();
