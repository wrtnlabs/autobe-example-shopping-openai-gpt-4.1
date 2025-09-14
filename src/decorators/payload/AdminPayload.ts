import { tags } from "typia";

/** Structure of the JWT payload for authenticated admin users. */
export interface AdminPayload {
  /** Top-level admin user table ID (UUID). */
  id: string & tags.Format<"uuid">;
  /** Discriminator for role-based authentication. */
  type: "admin";
}
