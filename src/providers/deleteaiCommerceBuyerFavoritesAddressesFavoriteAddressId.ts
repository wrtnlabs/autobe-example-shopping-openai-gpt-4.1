import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Remove (soft delete) a favorite address for the user
 * (ai_commerce_favorites_addresses).
 *
 * Logically deletes a favorite address belonging to the requesting buyer by
 * setting its `deleted_at` field. Ensures the favorite address exists, is
 * active (not previously deleted), and is owned by the authenticated buyer.
 * Throws an error if the address cannot be found or is not eligible for
 * deletion.
 *
 * @param props - The request properties.
 * @param props.buyer - The authenticated buyer making the request.
 * @param props.favoriteAddressId - The unique identifier for the favorite
 *   address to remove.
 * @returns Void
 * @throws {Error} If the favorite address does not exist, is already deleted,
 *   or is not owned by the buyer.
 */
export async function deleteaiCommerceBuyerFavoritesAddressesFavoriteAddressId(props: {
  buyer: BuyerPayload;
  favoriteAddressId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { buyer, favoriteAddressId } = props;
  // Strict authorization: only the owner (buyer) can access this favorite address, and only if not already deleted.
  const favorite =
    await MyGlobal.prisma.ai_commerce_favorites_addresses.findFirst({
      where: {
        id: favoriteAddressId,
        user_id: buyer.id,
        deleted_at: null,
      },
    });
  if (!favorite) {
    throw new Error(
      "Favorite address not found, already deleted, or not owned by the requesting buyer.",
    );
  }
  // Perform soft delete by setting deleted_at to now (ISO8601 string).
  await MyGlobal.prisma.ai_commerce_favorites_addresses.update({
    where: { id: favoriteAddressId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
