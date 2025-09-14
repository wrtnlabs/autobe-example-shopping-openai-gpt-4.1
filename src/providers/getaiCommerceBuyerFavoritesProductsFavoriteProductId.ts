import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesProducts } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesProducts";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Retrieve a specific product favorite by favoriteProductId from
 * ai_commerce_favorites_products.
 *
 * This operation fetches the favorited product record for the authenticated
 * buyer by its unique id, ensuring that the requesting buyer is the owner and
 * the favorite has not been deleted. The returned structure includes product,
 * snapshot, labeling, folder, and all relevant timestamps. Only accessible to
 * the favorite's owner. Throws an error if the favorite does not exist, is
 * soft-deleted, or belongs to another user.
 *
 * @param props - Object containing buyer authorization and the target
 *   favoriteProductId.
 * @param props.buyer - The authenticated buyer payload making the request
 *   (role: buyer)
 * @param props.favoriteProductId - Unique identifier of the favorite to
 *   retrieve
 * @returns The IAiCommerceFavoritesProducts object with complete favorite
 *   record details
 * @throws {Error} If the favorite does not exist, is soft-deleted, or not owned
 *   by the requesting buyer
 */
export async function getaiCommerceBuyerFavoritesProductsFavoriteProductId(props: {
  buyer: BuyerPayload;
  favoriteProductId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceFavoritesProducts> {
  const { buyer, favoriteProductId } = props;
  const favorite =
    await MyGlobal.prisma.ai_commerce_favorites_products.findFirst({
      where: {
        id: favoriteProductId,
        user_id: buyer.id,
        deleted_at: null,
      },
    });
  if (!favorite) {
    throw new Error("Favorite not found or access denied");
  }
  return {
    id: favorite.id,
    product_id: favorite.product_id,
    label: favorite.label === null ? undefined : favorite.label,
    folder_id: favorite.folder_id === null ? undefined : favorite.folder_id,
    snapshot_id: favorite.snapshot_id,
    created_at: toISOStringSafe(favorite.created_at),
    updated_at: toISOStringSafe(favorite.updated_at),
    deleted_at:
      favorite.deleted_at === null
        ? undefined
        : toISOStringSafe(favorite.deleted_at),
  };
}
