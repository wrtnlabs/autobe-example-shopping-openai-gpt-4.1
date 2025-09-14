import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerDispute";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing seller dispute (ai_commerce_seller_disputes) by ID.
 *
 * Updates business evidence data, workflow status, or resolution notes for a
 * seller dispute record identified by sellerDisputeId. Only authorized
 * administrators may perform this operation. All updates are tracked for
 * compliance and integrity. Throws error if record not found.
 *
 * @param props - Operation properties
 * @param props.admin - Authenticated system administrator (AdminPayload)
 * @param props.sellerDisputeId - UUID of the seller dispute to update
 * @param props.body - Update payload: workflow status, dispute data, resolution
 *   notes, etc.
 * @returns The updated seller dispute reflecting the new state
 * @throws {Error} If the seller dispute does not exist
 */
export async function putaiCommerceAdminSellerDisputesSellerDisputeId(props: {
  admin: AdminPayload;
  sellerDisputeId: string & tags.Format<"uuid">;
  body: IAiCommerceSellerDispute.IUpdate;
}): Promise<IAiCommerceSellerDispute> {
  // 1. Check existence of dispute
  const found = await MyGlobal.prisma.ai_commerce_seller_disputes.findUnique({
    where: { id: props.sellerDisputeId },
  });
  if (!found) throw new Error("Seller dispute not found");
  // 2. Prepare update data (immutable, inline)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updateInput = {
    dispute_type: props.body.dispute_type ?? undefined,
    dispute_data: props.body.dispute_data ?? undefined,
    status: props.body.status ?? undefined,
    resolution_notes: props.body.resolution_notes ?? undefined,
    updated_at: props.body.updated_at ?? now,
  };
  // 3. Perform update and select all DTO fields
  const updated = await MyGlobal.prisma.ai_commerce_seller_disputes.update({
    where: { id: props.sellerDisputeId },
    data: updateInput,
    select: {
      id: true,
      seller_profile_id: true,
      dispute_type: true,
      dispute_data: true,
      status: true,
      resolution_notes: true,
      created_at: true,
      updated_at: true,
    },
  });
  return {
    id: updated.id,
    seller_profile_id: updated.seller_profile_id,
    dispute_type: updated.dispute_type,
    dispute_data: updated.dispute_data,
    status: updated.status,
    resolution_notes:
      updated.resolution_notes !== null ? updated.resolution_notes : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
