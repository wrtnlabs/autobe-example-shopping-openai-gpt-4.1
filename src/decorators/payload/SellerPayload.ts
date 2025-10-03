import { tags } from "typia";

/**
 * Seller JWT Payload.
 *
 * - Id: shopping_mall_customers.id (top-level user identification)
 * - Type: "seller" (discriminator)
 */
export interface SellerPayload {
  /** Top-level user table ID (shopping_mall_customers.id). */
  id: string & tags.Format<"uuid">;
  /** Discriminator for seller role. */
  type: "seller";
}
