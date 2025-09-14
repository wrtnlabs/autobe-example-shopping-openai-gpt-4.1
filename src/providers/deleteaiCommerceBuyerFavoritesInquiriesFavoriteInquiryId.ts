import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Remove a favorite inquiry (soft delete) for the authenticated user.
 *
 * This operation performs a soft delete of a favorite inquiry associated with
 * the given user, ensuring that only the owner can perform the operation. The
 * record is located via unique id and owner (user_id), and is only removed if
 * not previously deleted. The soft delete is implemented by setting the
 * deleted_at date to the current UTC ISO string, preserving auditability.
 *
 * @param props - Object containing the buyer authentication context and the
 *   favorite inquiry UUID.
 * @param props.buyer - BuyerPayload representing the current authenticated
 *   user.
 * @param props.favoriteInquiryId - The unique identifier of the favorite
 *   inquiry to delete.
 * @returns Void
 * @throws {Error} If the favorite inquiry does not exist, has already been
 *   deleted, or does not belong to the user.
 */
export async function deleteaiCommerceBuyerFavoritesInquiriesFavoriteInquiryId(props: {
  buyer: BuyerPayload;
  favoriteInquiryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { buyer, favoriteInquiryId } = props;
  const favorite =
    await MyGlobal.prisma.ai_commerce_favorites_inquiries.findFirst({
      where: {
        id: favoriteInquiryId,
        user_id: buyer.id,
        deleted_at: null,
      },
    });
  if (favorite === null) {
    throw new Error(
      "Favorite inquiry not found, already deleted, or you are not authorized to delete it.",
    );
  }
  await MyGlobal.prisma.ai_commerce_favorites_inquiries.update({
    where: { id: favoriteInquiryId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
