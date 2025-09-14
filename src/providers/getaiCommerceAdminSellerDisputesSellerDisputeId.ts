import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerDispute";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information for a single seller dispute case
 * (ai_commerce_seller_disputes) by ID.
 *
 * This API returns the full details of a specific seller dispute as recorded in
 * ai_commerce_seller_disputes, including dispute type, workflow status,
 * context, attached evidence, and business/legal metadata fields. Only
 * authorized admins may use this API.
 *
 * @param props - Object containing all parameters for this operation.
 * @param props.admin - The authenticated admin user making the request
 * @param props.sellerDisputeId - Unique identifier (UUID) for the seller
 *   dispute
 * @returns Full details of the requested seller dispute, including all metadata
 *   and workflow states.
 * @throws {Error} When the specified seller dispute does not exist or is not
 *   accessible
 */
export async function getaiCommerceAdminSellerDisputesSellerDisputeId(props: {
  admin: AdminPayload;
  sellerDisputeId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceSellerDispute> {
  const { sellerDisputeId } = props;
  const dispute = await MyGlobal.prisma.ai_commerce_seller_disputes.findUnique({
    where: { id: sellerDisputeId },
  });
  if (!dispute) {
    throw new Error("Seller dispute not found");
  }
  return {
    id: dispute.id,
    seller_profile_id: dispute.seller_profile_id,
    dispute_type: dispute.dispute_type,
    dispute_data: dispute.dispute_data,
    status: dispute.status,
    resolution_notes: dispute.resolution_notes ?? undefined,
    created_at: toISOStringSafe(dispute.created_at),
    updated_at: toISOStringSafe(dispute.updated_at),
  };
}
