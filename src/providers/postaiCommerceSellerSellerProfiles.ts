import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerProfiles";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Create a new seller profile (ai_commerce_seller_profiles table) for a
 * verified seller user.
 *
 * This endpoint creates a new seller profile for an authenticated seller. The
 * seller profile captures both public and private information, including
 * display name, branding metadata, approval status, and (optionally) a
 * suspension reason for compliance. Only authenticated sellers who have
 * completed onboarding may use this API, which is enforced at the
 * decorator/middleware layer.
 *
 * Uniqueness of the seller profile per user is enforced, so attempting to
 * create a second active profile for the same user will result in an error. A
 * full audit log is triggered for compliance (handled elsewhere).
 *
 * @param props - Input properties for seller-profile creation operation
 * @param props.seller - The authenticated SellerPayload; must match
 *   body.user_id
 * @param props.body - The profile creation payload (user_id, display_name,
 *   approval_status, and optional fields)
 * @returns Newly created IAiCommerceSellerProfiles object including all profile
 *   fields and timestamps
 * @throws {Error} If seller attempts to create a profile for another user, or
 *   if a profile already exists
 */
export async function postaiCommerceSellerSellerProfiles(props: {
  seller: SellerPayload;
  body: IAiCommerceSellerProfiles.ICreate;
}): Promise<IAiCommerceSellerProfiles> {
  // AUTHORIZATION: Sellers can only create their own profiles
  if (props.body.user_id !== props.seller.id) {
    throw new Error(
      "Unauthorized: You may only create a seller profile for yourself.",
    );
  }

  // UNIQ CHECK: Enforce only one active seller profile per user
  const existing = await MyGlobal.prisma.ai_commerce_seller_profiles.findFirst({
    where: { user_id: props.seller.id, deleted_at: null },
  });
  if (existing) {
    throw new Error("A seller profile already exists for this user.");
  }

  // PREPARE DATA
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const newId: string & tags.Format<"uuid"> = v4();

  // CREATE profile
  const created = await MyGlobal.prisma.ai_commerce_seller_profiles.create({
    data: {
      id: newId,
      user_id: props.seller.id,
      display_name: props.body.display_name,
      profile_metadata: props.body.profile_metadata ?? null,
      approval_status: props.body.approval_status,
      suspension_reason: props.body.suspension_reason ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  // MAP & RETURN: Convert all fields to the contract, handling null/optional
  return {
    id: created.id,
    user_id: created.user_id,
    display_name: created.display_name,
    profile_metadata: created.profile_metadata ?? null,
    approval_status: created.approval_status,
    suspension_reason: created.suspension_reason ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
