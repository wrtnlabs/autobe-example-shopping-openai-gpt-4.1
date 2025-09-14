import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerAppeal";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve a specific seller appeal case by ID (ai_commerce_seller_appeals).
 *
 * Fetch all available information for a seller appeal by its unique identifier.
 * Only the seller involved in the appeal has access; others are denied.
 * Date/time values are provided as ISO 8601-compliant strings. Soft-deleted
 * appeals are not supported—hard deletion is assumed due to missing soft delete
 * field in schema.
 *
 * @param props - Object containing the required authentication and parameters
 * @param props.seller - The authenticated seller making the request
 * @param props.sellerAppealId - The unique UUID of the seller appeal record
 * @returns Detailed appeal record with all fields, evidence, outcome, and
 *   workflow status
 * @throws {Error} If the appeal does not exist, or is not owned by the seller
 */
export async function getaiCommerceSellerSellerAppealsSellerAppealId(props: {
  seller: SellerPayload;
  sellerAppealId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceSellerAppeal> {
  const { seller, sellerAppealId } = props;

  // Find seller appeal by id
  const appeal = await MyGlobal.prisma.ai_commerce_seller_appeals.findUnique({
    where: { id: sellerAppealId },
  });
  if (!appeal) throw new Error("Appeal not found");

  // Fetch the seller profile to check for ownership
  const sellerProfile =
    await MyGlobal.prisma.ai_commerce_seller_profiles.findUnique({
      where: { id: appeal.seller_profile_id },
      select: { user_id: true },
    });
  if (!sellerProfile || sellerProfile.user_id !== seller.id) {
    throw new Error("You do not have permission to view this appeal.");
  }

  // Map result to DTO with date/time strings and correct optional fields
  return {
    id: appeal.id,
    seller_profile_id: appeal.seller_profile_id,
    appeal_type: appeal.appeal_type,
    appeal_data: appeal.appeal_data,
    status: appeal.status,
    resolution_notes: appeal.resolution_notes ?? undefined,
    created_at: toISOStringSafe(appeal.created_at),
    updated_at: toISOStringSafe(appeal.updated_at),
  };
}
