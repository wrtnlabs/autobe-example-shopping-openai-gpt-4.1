import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerStatusHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a single seller status history record by ID.
 *
 * This operation fetches the complete details of a seller status history event
 * given its unique identifier. It describes the status transition (old/new
 * values), the actor, business context, and timestamp. Only accessible to
 * authenticated administrators, enabling audit, traceability, or compliance
 * review workflows.
 *
 * @param props Input object containing the authenticated admin and seller
 *   status history ID
 * @param props.admin Authenticated administrator payload (authorization
 *   required)
 * @param props.sellerStatusHistoryId UUID of the target status history record
 * @returns The full seller status change event details matching
 *   IAiCommerceSellerStatusHistory
 * @throws {Error} If no record is found for the given ID
 */
export async function getaiCommerceAdminSellerStatusHistorySellerStatusHistoryId(props: {
  admin: AdminPayload;
  sellerStatusHistoryId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceSellerStatusHistory> {
  const { sellerStatusHistoryId } = props;

  const row =
    await MyGlobal.prisma.ai_commerce_seller_status_history.findUniqueOrThrow({
      where: { id: sellerStatusHistoryId },
      select: {
        id: true,
        user_id: true,
        seller_profile_id: true,
        previous_status: true,
        new_status: true,
        transition_reason: true,
        transition_actor: true,
        created_at: true,
      },
    });

  return {
    id: row.id,
    user_id: row.user_id,
    ...(row.seller_profile_id != null && {
      seller_profile_id: row.seller_profile_id,
    }),
    ...(row.previous_status != null && {
      previous_status: row.previous_status,
    }),
    new_status: row.new_status,
    ...(row.transition_reason != null && {
      transition_reason: row.transition_reason,
    }),
    transition_actor: row.transition_actor,
    created_at: toISOStringSafe(row.created_at),
  };
}
