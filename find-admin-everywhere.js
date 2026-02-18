const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

const uri = process.env.MONGO_URI;

async function findEverywhere() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        console.log('--- SEARCHING ALL DATABASES ---');

        const adminDb = client.db().admin();
        const dbs = await adminDb.listDatabases();

        let foundCount = 0;

        for (const dbInfo of dbs.databases) {
            const dbName = dbInfo.name;
            if (['admin', 'config', 'local'].includes(dbName)) continue;

            const db = client.db(dbName);
            const collections = await db.listCollections().toArray();

            for (const colInfo of collections) {
                const colName = colInfo.name;
                const collection = db.collection(colName);

                const admin = await collection.findOne({ email: 'admin@laundrypro.com' });
                if (admin) {
                    console.log(`✅ FOUND in Database: "${dbName}", Collection: "${colName}"`);
                    console.log(`   _id: ${admin._id}`);
                    foundCount++;
                }
            }
        }

        if (foundCount === 0) {
            console.log('❌ admin@laundrypro.com not found in any database on this connection.');
        }

        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    } finally {
        await client.close();
    }
}

findEverywhere();
