import mongoose from "mongoose"

declare global {
  // eslint-disable-next-line no-var
  var _mongooseConn: Promise<typeof mongoose> | undefined
}

export async function connectMongoose(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
  if (global._mongooseConn) return global._mongooseConn
  const dbName = process.env.MONGODB_DB || "manage_agency"
  // Ensure we connect to the same database used across legacy routes
  global._mongooseConn = mongoose.connect(uri, { autoIndex: true, dbName })
  return global._mongooseConn
}

export default connectMongoose
