import { tags } from "typia";

/** Payload for authenticated seller user in the shopping mall platform. */
export interface SellerPayload {
  /** Top-level seller ID (shopping_mall_sellers.id). */
  id: string & tags.Format<"uuid">;
  /** Discriminator for the seller role for authorization. */
  type: "seller";
}
