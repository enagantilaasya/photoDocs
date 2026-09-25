const mongoose = require('mongoose');

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/photo_gallery';

  try {
    const conn = await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 10000
    });
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.warn(`[MongoDB Warning] Primary database connection failed: ${error.message}`);
    // If running in development with a local MongoDB service available, try local fallback
    if (primaryUri !== 'mongodb://127.0.0.1:27017/photo_gallery') {
      console.log('[MongoDB] Attempting fallback to local MongoDB instance...');
      try {
        const localUri = 'mongodb://127.0.0.1:27017/photo_gallery';
        const conn = await mongoose.connect(localUri, {
          serverSelectionTimeoutMS: 5000
        });
        console.log(`[MongoDB] Connected successfully via local fallback: ${conn.connection.host}/${conn.connection.name}`);
        return conn;
      } catch (fallbackError) {
        console.error(`[MongoDB] Local fallback also failed: ${fallbackError.message}`);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
