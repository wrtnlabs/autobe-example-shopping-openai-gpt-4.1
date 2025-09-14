import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerAppeal";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Submit a new seller appeal regarding penalties, workflow actions, or payout
 * holds (ai_commerce_seller_appeals).
 *
 * Allows an authenticated seller to file an appeal regarding negative workflow
 * actions such as penalties, rejections, demotions, or payout blocks. The
 * seller must reference their own seller profile and provide an appeal type,
 * JSON-encoded appeal data, and initial appeal status. The operation ensures no
 * duplicate open appeals exist for the same case.
 *
 * Only the owner of the seller profile may file an appeal for that profile.
 * Duplicate concurrent appeals of the same type/status are prevented at the
 * application level. All actions are fully audited and date/datetime fields are
 * returned as ISO8601 strings.
 *
 * @param props - Request properties
 * @param props.seller - Authenticated seller making the appeal; must own the
 *   referenced profile
 * @param props.body - Seller appeal creation details (must reference owned
 *   seller profile)
 * @returns The created seller appeal record (with audit fields and null
 *   resolution_notes)
 * @throws {Error} If seller does not own the referenced profile or duplicate
 *   open appeal exists
 */
export async function postaiCommerceSellerSellerAppeals(props: {
  seller: SellerPayload;
  body: IAiCommerceSellerAppeal.ICreate;
}): Promise<IAiCommerceSellerAppeal> {
  // Step 1: Validate seller ownership of seller_profile_id
  const sellerProfile =
    await MyGlobal.prisma.ai_commerce_seller_profiles.findUnique({
      where: { id: props.body.seller_profile_id },
    });
  if (!sellerProfile || sellerProfile.user_id !== props.seller.id) {
    throw new Error("You may only file an appeal for your own seller profile");
  }

  // Step 2: Check for duplicate/ongoing appeals for this unique case
  const duplicateAppeal =
    await MyGlobal.prisma.ai_commerce_seller_appeals.findFirst({
      where: {
        seller_profile_id: props.body.seller_profile_id,
        appeal_type: props.body.appeal_type,
        status: props.body.status,
      },
    });
  if (duplicateAppeal) {
    throw new Error("An appeal for this case already exists and is unresolved");
  }

  // Step 3: Prepare all fields for creation
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const newAppeal = await MyGlobal.prisma.ai_commerce_seller_appeals.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      seller_profile_id: props.body.seller_profile_id,
      appeal_type: props.body.appeal_type,
      appeal_data: props.body.appeal_data,
      status: props.body.status,
      resolution_notes: null,
      created_at: now,
      updated_at: now,
    },
  });

  // Step 4: Return result mapped to DTO
  return {
    id: newAppeal.id,
    seller_profile_id: newAppeal.seller_profile_id,
    appeal_type: newAppeal.appeal_type,
    appeal_data: newAppeal.appeal_data,
    status: newAppeal.status,
    resolution_notes: null,
    created_at: toISOStringSafe(newAppeal.created_at),
    updated_at: toISOStringSafe(newAppeal.updated_at),
  };
}
