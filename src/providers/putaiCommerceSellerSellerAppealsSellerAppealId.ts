import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerAppeal";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update a pending seller appeal (ai_commerce_seller_appeals) by ID.
 *
 * This endpoint allows the seller to update supporting evidence, resolution
 * notes, or status of their own pending appeal entry, identified by
 * sellerAppealId. Only the owner of the appeal's seller profile may perform
 * updates. Appeal must not be in 'closed' or 'finalized' states; updates to
 * completed appeals are forbidden.
 *
 * @param props - Contains the authenticated seller, target sellerAppealId, and
 *   update body
 * @param props.seller - The authenticated SellerPayload object (JWT, contains
 *   buyer user id)
 * @param props.sellerAppealId - The unique ID of the seller appeal (UUID)
 * @param props.body - The update payload with optionally appeal_data, status,
 *   or resolution_notes
 * @returns The updated seller appeal record, strictly matching
 *   IAiCommerceSellerAppeal fields.
 * @throws {Error} When the appeal doesn't exist, is not owned by the seller, or
 *   has a non-editable status
 */
export async function putaiCommerceSellerSellerAppealsSellerAppealId(props: {
  seller: SellerPayload;
  sellerAppealId: string & tags.Format<"uuid">;
  body: IAiCommerceSellerAppeal.IUpdate;
}): Promise<IAiCommerceSellerAppeal> {
  const { seller, sellerAppealId, body } = props;
  // Step 1: Fetch the existing appeal record (throws if not found)
  const appeal =
    await MyGlobal.prisma.ai_commerce_seller_appeals.findUniqueOrThrow({
      where: { id: sellerAppealId },
    });

  // Step 2: Check ownership via the seller's profile
  const sellerProfile =
    await MyGlobal.prisma.ai_commerce_seller_profiles.findUniqueOrThrow({
      where: { id: appeal.seller_profile_id },
    });
  if (seller.id !== sellerProfile.user_id) {
    throw new Error("Forbidden: Only the owner seller may update this appeal.");
  }

  // Step 3: Check that status is still modifiable
  if (appeal.status === "closed" || appeal.status === "finalized") {
    throw new Error("This seller appeal is not editable in its current state.");
  }

  // Step 4: Update allowed, inline fields only
  const updated = await MyGlobal.prisma.ai_commerce_seller_appeals.update({
    where: { id: sellerAppealId },
    data: {
      appeal_data: body.appeal_data ?? undefined,
      status: body.status ?? undefined,
      resolution_notes: body.resolution_notes ?? undefined,
      // updated_at is auto-set by Prisma's @updatedAt attribute
    },
  });

  // Step 5: Strictly map response for API contract (all dates must be strings)
  return {
    id: updated.id,
    seller_profile_id: updated.seller_profile_id,
    appeal_type: updated.appeal_type,
    appeal_data: updated.appeal_data,
    status: updated.status,
    resolution_notes: updated.resolution_notes ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
