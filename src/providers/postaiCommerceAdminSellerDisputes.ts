import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerDispute";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new seller dispute, escalation, or penalty case
 * (ai_commerce_seller_disputes).
 *
 * This endpoint allows administrative users (admins) to register a new
 * seller-centric dispute, penalty, or compliance escalation. The created record
 * is linked to a specific seller profile and includes detailed context, type,
 * evidence, and workflow metadata. The function applies business rules to
 * prevent duplicate open disputes of the same type for the same seller. On
 * success, returns the created dispute record.
 *
 * Authorization: Admin only (admin parameter required)
 *
 * @param props - Parameters for the operation
 * @param props.admin - Authenticated admin payload (must have global platform
 *   admin privileges)
 * @param props.body - Dispute creation DTO; must include seller_profile_id,
 *   dispute_type, dispute_data, status, created_at, and optionally
 *   updated_at/resolution_notes
 * @returns The newly created seller dispute record, including all workflow and
 *   metadata fields
 * @throws {Error} When seller profile is not found (not existing or
 *   soft-deleted)
 * @throws {Error} When a duplicate open/in-progress dispute exists for the same
 *   seller and type
 */
export async function postaiCommerceAdminSellerDisputes(props: {
  admin: AdminPayload;
  body: IAiCommerceSellerDispute.ICreate;
}): Promise<IAiCommerceSellerDispute> {
  const { admin, body } = props;

  // 1. Validate seller profile exists and not soft-deleted
  const sellerProfile =
    await MyGlobal.prisma.ai_commerce_seller_profiles.findFirst({
      where: {
        id: body.seller_profile_id,
        deleted_at: null,
      },
    });
  if (!sellerProfile) {
    throw new Error("Seller profile not found or has been deleted.");
  }

  // 2. Prevent duplicate open/in-progress dispute for the same seller and event
  const duplicate = await MyGlobal.prisma.ai_commerce_seller_disputes.findFirst(
    {
      where: {
        seller_profile_id: body.seller_profile_id,
        dispute_type: body.dispute_type,
        status: { in: ["open", "in_progress"] },
      },
    },
  );
  if (duplicate) {
    throw new Error(
      "An open or in-progress dispute already exists for this seller and type.",
    );
  }

  // 3. Create the new seller dispute record
  const created = await MyGlobal.prisma.ai_commerce_seller_disputes.create({
    data: {
      id: v4(),
      seller_profile_id: body.seller_profile_id,
      dispute_type: body.dispute_type,
      dispute_data: body.dispute_data,
      status: body.status,
      resolution_notes:
        typeof body.resolution_notes === "undefined"
          ? null
          : body.resolution_notes,
      created_at: body.created_at,
      updated_at:
        typeof body.updated_at === "undefined" || body.updated_at === null
          ? body.created_at
          : body.updated_at,
    },
  });

  // 4. Return the created IAiCommerceSellerDispute, all fields conforming exactly to the DTO
  return {
    id: created.id,
    seller_profile_id: created.seller_profile_id,
    dispute_type: created.dispute_type,
    dispute_data: created.dispute_data,
    status: created.status,
    resolution_notes:
      typeof created.resolution_notes === "undefined"
        ? null
        : created.resolution_notes,
    created_at: created.created_at,
    updated_at: created.updated_at,
  };
}
