import { tags } from "typia";

/**
 * JWT payload for authenticated Seller role.
 *
 * - Id: Corresponds to ai_commerce_buyer.id (top-level user table ID for
 *   sellers).
 * - Type: Discriminator for role-based payload union.
 */
export interface SellerPayload {
  /** Top-level user table ID (ai_commerce_buyer.id). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for this role. */
  type: "seller";
}
