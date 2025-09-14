import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Remove a favorite inquiry (soft delete) for the authenticated seller
 *
 * This operation marks a favorited inquiry as deleted for the authenticated
 * seller. The logic ensures that the favorite exists, is not already deleted,
 * and is owned by the current seller before setting its deleted_at field to the
 * current timestamp (soft delete). Physical removal is not performed to
 * preserve compliance, privacy, and auditability. Throws an error if the
 * favorite is not found or does not belong to the seller.
 *
 * @param props - Properties for the deletion
 * @param props.seller - The authenticated seller payload
 * @param props.favoriteInquiryId - The UUID of the favorite inquiry to remove
 * @returns Void
 * @throws {Error} If the favorite inquiry is not found (already deleted or
 *   never existed)
 * @throws {Error} If the seller does not own this favorite inquiry
 */
export async function deleteaiCommerceSellerFavoritesInquiriesFavoriteInquiryId(props: {
  seller: SellerPayload;
  favoriteInquiryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, favoriteInquiryId } = props;

  // Fetch the favorite inquiry to confirm it exists and is not already deleted
  const record =
    await MyGlobal.prisma.ai_commerce_favorites_inquiries.findFirst({
      where: {
        id: favoriteInquiryId,
        deleted_at: null,
      },
    });
  if (!record) {
    throw new Error("Favorite inquiry not found or already deleted");
  }
  // Ownership check (seller.id = user_id)
  if (record.user_id !== seller.id) {
    throw new Error("Unauthorized: You do not own this favorite inquiry");
  }
  // Mark as deleted (soft delete)
  await MyGlobal.prisma.ai_commerce_favorites_inquiries.update({
    where: { id: favoriteInquiryId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
