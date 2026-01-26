const { GridFSBucket } = require("mongodb");

let bucket = null;

const initGridFS = (mongooseConnection) => {
  if (!mongooseConnection || !mongooseConnection.db) {
    throw new Error("GridFS initialization requires an active mongoose connection.");
  }

  bucket = new GridFSBucket(mongooseConnection.db, { bucketName: "uploads" });
};

const getBucket = () => {
  if (!bucket) {
    throw new Error("GridFS bucket not initialized. Call initGridFS after mongoose.connect.");
  }

  return bucket;
};

module.exports = { initGridFS, getBucket };
