import { Schema, model, models } from "mongoose"

/**
 * Minimal product model for lookups (full product CRUD may live elsewhere).
 * `strict: false` preserves legacy fields from the `products` collection.
 */
const ProductSchema = new Schema(
  {
    product_name: { type: String },
    nameLower: { type: String },
    deleted: { type: Boolean },
    status: { type: Schema.Types.Mixed },
  },
  { collection: "products", strict: false },
)

export const Product = models.Product || model("Product", ProductSchema)
