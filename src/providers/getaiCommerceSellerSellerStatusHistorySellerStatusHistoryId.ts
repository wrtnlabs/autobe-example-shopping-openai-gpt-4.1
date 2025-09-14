import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerStatusHistory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve a single seller status history record by ID
 * (ai_commerce_seller_status_history).
 *
 * This endpoint returns the details of a specific seller status history event,
 * including actor, status change, previous and new status, reason, and
 * timestamps. Only the seller whose account matches the record may access the
 * data.
 *
 * @param props - The props for this function
 * @param props.seller - The authenticated seller payload
 * @param props.sellerStatusHistoryId - The unique identifier (UUID) of the
 *   seller status history record to retrieve
 * @returns The IAiCommerceSellerStatusHistory record with all context fields
 * @throws {Error} If the status history record does not exist or does not
 *   belong to the authenticated seller
 */
export async function getaiCommerceSellerSellerStatusHistorySellerStatusHistoryId(props: {
  seller: SellerPayload;
  sellerStatusHistoryId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceSellerStatusHistory> {
  const { seller, sellerStatusHistoryId } = props;
  // Fetch the target status history record with exact field mapping
  const record =
    await MyGlobal.prisma.ai_commerce_seller_status_history.findUnique({
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
  if (!record) {
    throw new Error("Seller status history record not found");
  }
  // Check access rights: Only the seller that owns this record may access it
  if (record.user_id !== seller.id) {
    throw new Error(
      "Unauthorized: You can only view your own seller status history record",
    );
  }
  // Return mapped result, ensuring all dates as string & tags.Format<'date-time'>
  return {
    id: record.id,
    user_id: record.user_id,
    seller_profile_id:
      record.seller_profile_id === null ? undefined : record.seller_profile_id,
    previous_status:
      record.previous_status === null ? undefined : record.previous_status,
    new_status: record.new_status,
    transition_reason:
      record.transition_reason === null ? undefined : record.transition_reason,
    transition_actor: record.transition_actor,
    created_at: toISOStringSafe(record.created_at),
  };
}
