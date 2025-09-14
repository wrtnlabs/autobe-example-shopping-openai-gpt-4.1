import { tags } from "typia";

/**
 * Visitor JWT Payload
 *
 * - Id: ai_commerce_visitor.id (UUID for anonymous/guest user session)
 * - Type: "visitor"
 */
export interface VisitorPayload {
  /** Visitor UUID (ai_commerce_visitor.id, the fundamental visitor identifier). */
  id: string & tags.Format<"uuid">;

  /** Role discriminator for visitors. */
  type: "visitor";
}
