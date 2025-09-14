import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Erase (soft delete) a specified product favorite by favoriteProductId.
 *
 * This operation marks the product in the ai_commerce_favorites_products table
 * as deleted by setting its deleted_at timestamp. Only the buyer who added the
 * favorite can erase it; all attempts to delete a favorite not owned by the
 * buyer or already deleted will result in an error. This ensures audit
 * compliance and business logic integrity. After deletion, the favorite will be
 * excluded from all personalized and favorites queries.
 *
 * @param props - Object containing the buyer payload and the favoriteProductId
 *   to erase.
 * @param props.buyer - The authenticated buyer's payload.
 * @param props.favoriteProductId - The unique identifier (UUID) of the favorite
 *   product to be erased.
 * @returns Void
 * @throws {Error} If favorite product not found.
 * @throws {Error} If the buyer does not own this favorite.
 * @throws {Error} If the favorite is already deleted.
 */
export async function deleteaiCommerceBuyerFavoritesProductsFavoriteProductId(props: {
  buyer: BuyerPayload;
  favoriteProductId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { buyer, favoriteProductId } = props;

  // Find the favorite by its unique ID
  const favorite =
    await MyGlobal.prisma.ai_commerce_favorites_products.findUnique({
      where: { id: favoriteProductId },
      select: {
        id: true,
        user_id: true,
        deleted_at: true,
      },
    });
  if (!favorite) {
    throw new Error("Favorite product not found");
  }

  // Ensure only the owner can delete
  if (favorite.user_id !== buyer.id) {
    throw new Error("Forbidden: Cannot delete another user`s favorite");
  }

  // Ensure not already deleted
  if (favorite.deleted_at !== null) {
    throw new Error("Favorite already deleted");
  }

  // Soft delete (set deleted_at timestamp)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.ai_commerce_favorites_products.update({
    where: { id: favoriteProductId },
    data: { deleted_at: now },
  });
}
