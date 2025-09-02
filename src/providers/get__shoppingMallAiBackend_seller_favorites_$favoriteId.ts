import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve details about a single favorite by ID for the owner (seller).
 *
 * Gets full detail about a single favorite belonging to the seller (by seller's
 * ID), enforcing access to only non-deleted items genuinely owned by the
 * requesting seller. Returns fields such as target type, snapshot evidence,
 * folder association, and full timestamp trail.
 *
 * Only active (non-deleted) favorites are returned. If not found or not owned
 * by the seller, an error is thrown.
 *
 * @param props - Request properties
 * @param props.seller - Authenticated seller payload (ownership is checked by
 *   matching seller.id to favorite.shopping_mall_ai_backend_customer_id)
 * @param props.favoriteId - UUID of the favorite to retrieve
 * @returns The favorite details including evidence and folder info
 * @throws {Error} When the favorite is not found, is deleted, or is not owned
 *   by the seller
 */
export async function get__shoppingMallAiBackend_seller_favorites_$favoriteId(props: {
  seller: SellerPayload;
  favoriteId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendFavorite> {
  const { seller, favoriteId } = props;

  const favorite =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorites.findFirst({
      where: {
        id: favoriteId,
        deleted_at: null,
        shopping_mall_ai_backend_customer_id: seller.id,
      },
    });
  if (!favorite) throw new Error("Favorite not found or access forbidden");

  return {
    id: favorite.id,
    shopping_mall_ai_backend_customer_id:
      favorite.shopping_mall_ai_backend_customer_id,
    shopping_mall_ai_backend_favorite_folder_id:
      favorite.shopping_mall_ai_backend_favorite_folder_id ?? null,
    title_snapshot: favorite.title_snapshot ?? null,
    target_type: favorite.target_type,
    target_id_snapshot: favorite.target_id_snapshot ?? null,
    created_at: toISOStringSafe(favorite.created_at),
    updated_at: toISOStringSafe(favorite.updated_at),
    deleted_at: favorite.deleted_at
      ? toISOStringSafe(favorite.deleted_at)
      : null,
  };
}
