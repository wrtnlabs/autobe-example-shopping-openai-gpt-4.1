import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerProfiles";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update an existing seller profile.
 *
 * This operation updates an existing seller profile
 * (ai_commerce_seller_profiles) for the given sellerProfileId. It allows the
 * authenticated seller (profile owner) to modify display_name,
 * profile_metadata, approval_status, and suspension_reason. Only the profile
 * owner may update. All updates strictly follow schema constraints and always
 * update the updated_at field. Returns the updated profile. Throws if the
 * profile does not exist or if unauthorized.
 *
 * @param props - The update information and authentication payload
 * @param props.seller - The authenticated seller making the update
 * @param props.sellerProfileId - The unique profile id to update
 * @param props.body - The new profile data (subset of allowed fields)
 * @returns The fully updated seller profile
 * @throws {Error} If seller profile not found or user is not owner
 */
export async function putaiCommerceSellerSellerProfilesSellerProfileId(props: {
  seller: SellerPayload;
  sellerProfileId: string & tags.Format<"uuid">;
  body: IAiCommerceSellerProfiles.IUpdate;
}): Promise<IAiCommerceSellerProfiles> {
  const { seller, sellerProfileId, body } = props;
  // Fetch the profile and enforce ownership authorization.
  const profile = await MyGlobal.prisma.ai_commerce_seller_profiles.findUnique({
    where: { id: sellerProfileId },
  });
  if (profile == null) {
    throw new Error("Seller profile not found");
  }
  if (profile.user_id !== seller.id) {
    throw new Error("Unauthorized: only profile owner may update");
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.ai_commerce_seller_profiles.update({
    where: { id: sellerProfileId },
    data: {
      display_name: body.display_name ?? undefined,
      profile_metadata: body.profile_metadata ?? undefined,
      approval_status: body.approval_status ?? undefined,
      suspension_reason: body.suspension_reason ?? undefined,
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
