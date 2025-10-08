import { tags } from "typia";

/**
 * Payload type for authenticated admin users. Represents the structure injected
 * into controller handlers.
 */
export interface AdminPayload {
  /** Unique admin ID (top-level user identifier). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for role type. */
  type: "admin";
}
