import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Remove (soft delete) a favorite address for the user
 * (ai_commerce_favorites_addresses).
 *
 * Logically deletes a favorite address belonging to the requesting seller
 * (user) by setting its deleted_at field. This preserves the record for
 * compliance and audit while ensuring it is excluded from active listings. Only
 * the owner (seller) can erase their own favorite; unauthorized or
 * already-deleted addresses trigger errors. The operation is idempotent and
 * strictly enforces soft delete (never hard deletes).
 *
 * @param props - The function props.
 * @param props.seller - The authenticated seller attempting to delete the
 *   favorite.
 * @param props.favoriteAddressId - The UUID of the favorite address to delete.
 * @returns Void
 * @throws {Error} If the record does not exist, is already deleted, or does not
 *   belong to the seller.
 */
export async function deleteaiCommerceSellerFavoritesAddressesFavoriteAddressId(props: {
  seller: SellerPayload;
  favoriteAddressId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, favoriteAddressId } = props;
  const favorite =
    await MyGlobal.prisma.ai_commerce_favorites_addresses.findFirst({
      where: {
        id: favoriteAddressId,
        deleted_at: null,
      },
    });
  if (!favorite) {
    throw new Error("Favorite address not found or already deleted.");
  }
  if (favorite.user_id !== seller.id) {
    throw new Error(
      "Unauthorized: Only the owner may delete this favorite address.",
    );
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.ai_commerce_favorites_addresses.update({
    where: { id: favoriteAddressId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
