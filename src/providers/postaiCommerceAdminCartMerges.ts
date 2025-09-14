import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartMerge } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartMerge";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new cart merge record linking source and target carts by business
 * logic.
 *
 * This operation creates a persistent audit entry in the
 * ai_commerce_cart_merges table for administrative or recovery cart merge
 * events. Only authenticated and active admin users can create such records.
 * The merge is only valid when both source and target carts exist and are
 * different. The function enforces business invariants and ensures all fields
 * are written and returned in the correct ISO and UUID formats for compliance
 * and audit logging. Errors are thrown if validations are not met.
 *
 * @param props Object with admin authentication and merge parameters
 * @param props.admin The authenticated AdminPayload of the calling admin
 * @param props.body Parameters to create the cart merge: source_cart_id,
 *   target_cart_id, actor_id (optional), and reason
 * @returns The fully detailed IAiCommerceCartMerge record corresponding to the
 *   created merge event
 * @throws {Error} If source and target cart IDs are not different
 * @throws {Error} If either source or target cart does not exist
 */
export async function postaiCommerceAdminCartMerges(props: {
  admin: AdminPayload;
  body: IAiCommerceCartMerge.ICreate;
}): Promise<IAiCommerceCartMerge> {
  const { body } = props;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  if (body.source_cart_id === body.target_cart_id) {
    throw new Error("source_cart_id and target_cart_id must be different");
  }
  // Validate existence of both carts (required by business logic)
  const [sourceCart, targetCart] = await Promise.all([
    MyGlobal.prisma.ai_commerce_carts.findFirst({
      where: { id: body.source_cart_id },
    }),
    MyGlobal.prisma.ai_commerce_carts.findFirst({
      where: { id: body.target_cart_id },
    }),
  ]);
  if (!sourceCart) {
    throw new Error("Source cart not found");
  }
  if (!targetCart) {
    throw new Error("Target cart not found");
  }

  const cartMerge = await MyGlobal.prisma.ai_commerce_cart_merges.create({
    data: {
      id: v4(),
      source_cart_id: body.source_cart_id,
      target_cart_id: body.target_cart_id,
      actor_id: body.actor_id !== undefined ? body.actor_id : null,
      reason: body.reason,
      created_at: now,
    },
  });

  return {
    id: cartMerge.id,
    source_cart_id: cartMerge.source_cart_id,
    target_cart_id: cartMerge.target_cart_id,
    // Handle optional+nullable for actor_id (nullable in DB, optional in DTO)
    actor_id:
      cartMerge.actor_id !== undefined && cartMerge.actor_id !== null
        ? cartMerge.actor_id
        : undefined,
    reason: cartMerge.reason,
    created_at: toISOStringSafe(cartMerge.created_at),
  };
}
