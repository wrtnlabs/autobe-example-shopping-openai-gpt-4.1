import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesInquiries } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesInquiries";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Get detailed information for a specific inquiry favorite by
 * favoriteInquiryId.
 *
 * Retrieves detailed information about a single inquiry favorite by its unique
 * ID from ai_commerce_favorites_inquiries, including links to the inquiry
 * snapshot, organizational data, and notification state. This supports
 * user-facing favorite management, alert updates, and evidence compliance
 * flows.
 *
 * Only authenticated users can access their own favorites, and errors are
 * returned for missing, deleted, or unauthorized favorites.
 *
 * @param props - Object containing the authenticated buyer payload and the
 *   favorite inquiry id
 * @param props.buyer - The authenticated BuyerPayload (must own the favorite to
 *   access it)
 * @param props.favoriteInquiryId - The unique ID of the inquiry favorite to
 *   retrieve
 * @returns The IAiCommerceFavoritesInquiries object matching the provided ID,
 *   with all detail and organizational fields populated
 * @throws {Error} If the favorite inquiry is not found, is deleted, or the
 *   caller is not authorized to access this record
 */
export async function getaiCommerceBuyerFavoritesInquiriesFavoriteInquiryId(props: {
  buyer: BuyerPayload;
  favoriteInquiryId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceFavoritesInquiries> {
  const record =
    await MyGlobal.prisma.ai_commerce_favorites_inquiries.findUnique({
      where: { id: props.favoriteInquiryId },
      select: {
        id: true,
        user_id: true,
        inquiry_id: true,
        folder_id: true,
        snapshot_id: true,
        label: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (
    !record ||
    record.user_id !== props.buyer.id ||
    (record.deleted_at !== null && record.deleted_at !== undefined)
  ) {
    throw new Error("Inquiry favorite not found or unauthorized");
  }

  return {
    id: record.id,
    user_id: record.user_id,
    inquiry_id: record.inquiry_id,
    folder_id: record.folder_id ?? undefined,
    snapshot_id: record.snapshot_id,
    label: record.label ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at !== undefined && record.deleted_at !== null
        ? toISOStringSafe(record.deleted_at)
        : undefined,
  };
}
