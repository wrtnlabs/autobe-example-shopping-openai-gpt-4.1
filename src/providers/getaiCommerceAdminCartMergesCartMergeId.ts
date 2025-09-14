import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartMerge } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartMerge";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information about a specific cart merge using cartMergeId.
 *
 * Fetch full details about a single cart merge event using its unique
 * cartMergeId. The ai_commerce_cart_merges table logs each cart merge for
 * audit, user support, or session recovery analysis. The returned data includes
 * the source and target cart IDs, actor, reason, and merge timestamp.
 *
 * This operation is essential for forensic troubleshooting, understanding merge
 * outcomes, or reconstructing user sessions in compliance or support incidents.
 * Strict authorization ensures only users with administrative or support rights
 * can access this level of detail. If the cart merge record does not exist, the
 * operation returns a clear not-found error.
 *
 * Personal data is masked as required by privacy policy. All access attempts
 * are logged for compliance monitoring.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated administrator performing the access
 *   request
 * @param props.cartMergeId - The unique identifier of the cart merge record to
 *   retrieve (UUID)
 * @returns Detailed information about the targeted cart merge record
 * @throws {Error} When the specified cart merge record does not exist or admin
 *   is unauthorized
 */
export async function getaiCommerceAdminCartMergesCartMergeId(props: {
  admin: AdminPayload;
  cartMergeId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceCartMerge> {
  const { cartMergeId } = props;
  // Retrieve the cart merge record from the database
  const record = await MyGlobal.prisma.ai_commerce_cart_merges.findFirst({
    where: { id: cartMergeId },
    select: {
      id: true,
      source_cart_id: true,
      target_cart_id: true,
      actor_id: true,
      reason: true,
      created_at: true,
    },
  });
  if (!record) {
    throw new Error("Cart merge record not found");
  }
  return {
    id: record.id,
    source_cart_id: record.source_cart_id,
    target_cart_id: record.target_cart_id,
    actor_id: record.actor_id === null ? undefined : record.actor_id,
    reason: record.reason,
    created_at: toISOStringSafe(record.created_at),
  };
}
