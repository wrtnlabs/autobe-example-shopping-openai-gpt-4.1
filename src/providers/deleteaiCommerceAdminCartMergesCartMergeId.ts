import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently erase a cart merge record (admin compliance only).
 *
 * This operation permanently deletes a cart merge record identified by
 * cartMergeId from ai_commerce_cart_merges. Deletion is audit-logged in
 * ai_commerce_cart_audit_logs with full pre-deletion record state. Only system
 * administrators with active privileges may perform this operation.
 *
 * @param props - Operation parameters
 * @param props.admin - The authenticated admin payload (must be active)
 * @param props.cartMergeId - Unique identifier of the cart merge record to
 *   permanently erase
 * @returns Void
 * @throws {Error} If the cart merge record does not exist
 */
export async function deleteaiCommerceAdminCartMergesCartMergeId(props: {
  admin: AdminPayload;
  cartMergeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch the cart merge; throw if not found
  const merge = await MyGlobal.prisma.ai_commerce_cart_merges.findUnique({
    where: { id: props.cartMergeId },
  });
  if (!merge) {
    throw new Error("Cart merge record not found");
  }

  // Step 2: Delete the cart merge record (hard erase)
  await MyGlobal.prisma.ai_commerce_cart_merges.delete({
    where: { id: props.cartMergeId },
  });

  // Step 3: Create an audit log entry for compliance
  await MyGlobal.prisma.ai_commerce_cart_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      cart_id: undefined,
      actor_id: props.admin.id,
      entity_type: "cart_merge",
      action_type: "delete",
      before_state_json: JSON.stringify(merge),
      after_state_json: undefined,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
