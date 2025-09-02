import { tags } from "typia";

/**
 * Payload injected for an authenticated seller account via SellerAuth
 * decorator.
 *
 * - Id: The seller's unique UUID (top-level ID used in JWT and DB)
 * - Type: "seller" discriminator
 */
export interface SellerPayload {
  /** Top-level seller account ID (UUID). */
  id: string & tags.Format<"uuid">;
  /** Discriminator for role type: always "seller" for this payload. */
  type: "seller";
}
