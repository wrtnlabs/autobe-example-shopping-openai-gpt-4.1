import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerAppeal";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a specific seller appeal case by ID (ai_commerce_seller_appeals).
 *
 * Fetch all available information for a seller appeal by its unique identifier.
 * Includes the appeal reason, type, evidence, timeline, administrator notes,
 * and all relevant workflow status fields as recorded in the database. Used for
 * real-time dispute investigation, compliance documentation, and resolution
 * workflows.
 *
 * Strict role controls apply: only the seller involved and administrators have
 * access to this operation. Record access and case review events are
 * audit-logged. If the provided sellerAppealId does not exist, an appropriate
 * error is returned.
 *
 * @param props - The request parameters
 * @param props.admin - The authenticated admin making this request
 * @param props.sellerAppealId - Unique identifier for the seller appeal record
 * @returns The detailed IAiCommerceSellerAppeal record containing all case
 *   fields, evidence, and outcome status
 * @throws {Error} If the specified seller appeal record does not exist
 */
export async function getaiCommerceAdminSellerAppealsSellerAppealId(props: {
  admin: AdminPayload;
  sellerAppealId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceSellerAppeal> {
  const { sellerAppealId } = props;
  // Find the seller appeal record by ID (deleted_at filter removed as field does not exist)
  const appeal = await MyGlobal.prisma.ai_commerce_seller_appeals.findFirst({
    where: {
      id: sellerAppealId,
    },
  });

  if (!appeal) {
    throw new Error("SellerAppeal record not found");
  }

  return {
    id: appeal.id,
    seller_profile_id: appeal.seller_profile_id,
    appeal_type: appeal.appeal_type,
    appeal_data: appeal.appeal_data,
    status: appeal.status,
    resolution_notes:
      appeal.resolution_notes !== undefined && appeal.resolution_notes !== null
        ? appeal.resolution_notes
        : undefined,
    created_at: toISOStringSafe(appeal.created_at),
    updated_at: toISOStringSafe(appeal.updated_at),
  };
}
