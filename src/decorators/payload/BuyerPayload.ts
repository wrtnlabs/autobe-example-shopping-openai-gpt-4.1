import { tags } from "typia";

/**
 * Payload injected for authenticated Buyer (ai_commerce_buyer).
 *
 * - `id`: Top-level user table ID (UUID)
 * - `type`: Discriminator for role type
 */
export interface BuyerPayload {
  /** Top-level user table ID (the fundamental buyer identifier in the system). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type denoting buyer role. */
  type: "buyer";
}
