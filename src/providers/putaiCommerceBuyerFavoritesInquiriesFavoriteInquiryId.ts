import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesInquiries } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesInquiries";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Update label, folder, or alert settings for an existing inquiry favorite by
 * favoriteInquiryId.
 *
 * Allows an authenticated user to update organizational metadata for an inquiry
 * favorite, such as changing its folder, updating a label, or adjusting alert
 * preferences. User authorization is required, and attempts to edit another
 * user's favorite or a deleted entry will fail.
 *
 * Content and snapshot linkage remain read-only for audit and compliance.
 * Updated records are returned in full, allowing front ends to reflect new
 * organization, alerts, or preferences immediately.
 *
 * @param props - Request context
 * @param props.buyer - The authenticated buyer making the request
 * @param props.favoriteInquiryId - The unique identifier of the inquiry
 *   favorite to update
 * @param props.body - Updatable organizational data for the inquiry favorite
 *   (folder_id, label)
 * @returns The updated inquiry favorite record as stored
 *   (IAiCommerceFavoritesInquiries)
 * @throws {Error} When the favorite inquiry is not found, deleted, or not owned
 *   by the buyer
 */
export async function putaiCommerceBuyerFavoritesInquiriesFavoriteInquiryId(props: {
  buyer: BuyerPayload;
  favoriteInquiryId: string & tags.Format<"uuid">;
  body: IAiCommerceFavoritesInquiries.IUpdate;
}): Promise<IAiCommerceFavoritesInquiries> {
  const { buyer, favoriteInquiryId, body } = props;
  // Step 1: Fetch and verify favorite inquiry ownership and status
  const existing =
    await MyGlobal.prisma.ai_commerce_favorites_inquiries.findFirst({
      where: {
        id: favoriteInquiryId,
        user_id: buyer.id,
        deleted_at: null,
      },
    });
  if (!existing) {
    throw new Error("Favorite inquiry not found or not owned by user");
  }
  // Step 2: Update modifiable fields and updated_at timestamp
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.ai_commerce_favorites_inquiries.update({
    where: { id: favoriteInquiryId },
    data: {
      folder_id: body.folder_id ?? null,
      label: body.label ?? null,
      updated_at: now,
    },
  });
  // Step 3: Format and return the updated record strictly matching DTO types
  return {
    id: updated.id,
    user_id: updated.user_id,
    inquiry_id: updated.inquiry_id,
    folder_id:
      updated.folder_id === undefined ? undefined : (updated.folder_id ?? null),
    snapshot_id: updated.snapshot_id,
    label: updated.label === undefined ? undefined : (updated.label ?? null),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === undefined
        ? undefined
        : updated.deleted_at
          ? toISOStringSafe(updated.deleted_at)
          : null,
  };
}
