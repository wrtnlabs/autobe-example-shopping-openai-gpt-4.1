import { tags } from "typia";

/**
 * Payload injected for authenticated admin users. Contains top-level admin id
 * (UUID) and discriminator for admin.
 */
export interface AdminPayload {
  /** Top-level admin id (UUID). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for admin role. */
  type: "admin";
}
