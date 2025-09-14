import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerProfiles";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing seller profile (ai_commerce_seller_profiles table) for the
 * specified sellerProfileId.
 *
 * This function allows an authenticated admin to update profile fields such as
 * display_name, profile_metadata, approval_status, and suspension_reason for
 * any seller's profile. The update is subject to field-level constraints as in
 * the database schema, and all date fields are returned as ISO 8601 formatted
 * strings. If the record does not exist, an error is thrown. Admin global
 * permission is enforced via decorator validation.
 *
 * @param props - Input object containing:
 *
 *   - Admin: Authenticated admin payload (must be valid for endpoint)
 *   - SellerProfileId: UUID of the seller profile to update
 *   - Body: Partial update payload with fields to change
 *
 * @returns The updated IAiCommerceSellerProfiles object, with all date fields
 *   formatted as ISO 8601 strings and nullable fields handled appropriately
 * @throws {Error} If the seller profile does not exist, or if the update fails
 */
export async function putaiCommerceAdminSellerProfilesSellerProfileId(props: {
  admin: AdminPayload;
  sellerProfileId: string & tags.Format<"uuid">;
  body: IAiCommerceSellerProfiles.IUpdate;
}): Promise<IAiCommerceSellerProfiles> {
  const { sellerProfileId, body } = props;

  // Query for the profile, ensuring it's not soft-deleted
  const profile = await MyGlobal.prisma.ai_commerce_seller_profiles.findFirst({
    where: {
      id: sellerProfileId,
      deleted_at: null,
    },
  });
  if (!profile) throw new Error("Seller profile not found");

  // Update only provided fields & bump updated_at
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.ai_commerce_seller_profiles.update({
    where: { id: sellerProfileId },
    data: {
      ...(body.display_name !== undefined && {
        display_name: body.display_name,
      }),
      ...(body.profile_metadata !== undefined && {
        profile_metadata: body.profile_metadata,
      }),
      ...(body.approval_status !== undefined && {
        approval_status: body.approval_status,
      }),
      ...(body.suspension_reason !== undefined && {
        suspension_reason: body.suspension_reason,
      }),
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    user_id: updated.user_id,
    display_name: updated.display_name,
    profile_metadata: updated.profile_metadata ?? undefined,
    approval_status: updated.approval_status,
    suspension_reason: updated.suspension_reason ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
