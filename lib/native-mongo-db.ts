import type { Db } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { MONGODB_DB_NAME } from "@/lib/database-config"

/** Native MongoDB `Db` instance (same DB name as Mongoose `connectMongoose`). */
export async function getNativeMongoDb(): Promise<Db> {
  const client = await clientPromise
  return client.db(MONGODB_DB_NAME)
}
