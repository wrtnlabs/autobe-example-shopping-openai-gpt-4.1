import { tags } from "typia";

/** JWT payload for Admin authentication (top-level admin account). */
export interface AdminPayload {
  /** Top-level admin user table ID. UUID string identifying the admin account. */
  id: string & tags.Format<"uuid">;

  /** Discriminator for admin role. */
  type: "admin";
}
