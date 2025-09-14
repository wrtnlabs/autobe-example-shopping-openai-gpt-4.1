import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerProfiles";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Admin retrieves a complete seller profile by ID for audit or moderation.
 *
 * This operation returns all business, branding, compliance, status, and audit
 * fields defined in the ai_commerce_seller_profiles schema for a specific
 * seller profile, as identified by its unique ID. Only platform administrators
 * are permitted to perform this operation. If the seller profile does not
 * exist, an error is thrown.
 *
 * @param props - The request parameters.
 * @param props.admin - The authenticated admin performing the retrieval. Used
 *   for authorization.
 * @param props.sellerProfileId - The UUID of the seller profile to retrieve.
 * @returns The seller profile with all business/compliance/status information
 *   populated.
 * @throws {Error} If the seller profile does not exist or has been deleted.
 */
export async function getaiCommerceAdminSellerProfilesSellerProfileId(props: {
  admin: AdminPayload;
  sellerProfileId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceSellerProfiles> {
  const { sellerProfileId } = props;

  const profile = await MyGlobal.prisma.ai_commerce_seller_profiles.findFirst({
    where: { id: sellerProfileId },
    select: {
      id: true,
      user_id: true,
      display_name: true,
      profile_metadata: true,
      approval_status: true,
      suspension_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (profile === null) {
    throw new Error("Seller profile not found");
  }

  return {
    id: profile.id,
    user_id: profile.user_id,
    display_name: profile.display_name,
    profile_metadata: profile.profile_metadata ?? undefined,
    approval_status: profile.approval_status,
    suspension_reason: profile.suspension_reason ?? undefined,
    created_at: toISOStringSafe(profile.created_at),
    updated_at: toISOStringSafe(profile.updated_at),
    // deleted_at is optional: can be undefined, or string date, or null
    deleted_at:
      profile.deleted_at !== null && profile.deleted_at !== undefined
        ? toISOStringSafe(profile.deleted_at)
        : (profile.deleted_at ?? undefined),
  };
}
