import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesProducts } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesProducts";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Update metadata for an existing product favorite by favoriteProductId.
 *
 * This operation allows a buyer to update organization metadata (label and
 * folder assignment) for a product they have already favorited, given its UUID.
 * It enforces ownership and not-deleted checks, and supports partial or no-op
 * updates.
 *
 * @param props - Object containing:
 *
 *   - Buyer: BuyerPayload, the authenticated buyer
 *   - FavoriteProductId: UUID of the product favorite to update
 *   - Body: { label?: string, folder_id?: string } (metadata to update)
 *
 * @returns The updated favorite product record with updated metadata
 * @throws {Error} If the favorite does not exist, does not belong to buyer, or
 *   is already deleted
 */
export async function putaiCommerceBuyerFavoritesProductsFavoriteProductId(props: {
  buyer: BuyerPayload;
  favoriteProductId: string & tags.Format<"uuid">;
  body: IAiCommerceFavoritesProducts.IUpdate;
}): Promise<IAiCommerceFavoritesProducts> {
  const { buyer, favoriteProductId, body } = props;
  // 1. Strictly find only active and owned favorite
  const favorite =
    await MyGlobal.prisma.ai_commerce_favorites_products.findFirst({
      where: {
        id: favoriteProductId,
        user_id: buyer.id,
        deleted_at: null,
      },
    });
  if (!favorite) {
    throw new Error("Favorite not found or already deleted");
  }
  // 2. Prepare update input, updating only allowed fields
  const updated = await MyGlobal.prisma.ai_commerce_favorites_products.update({
    where: { id: favoriteProductId },
    data: {
      label: body.label !== undefined ? body.label : undefined,
      folder_id: body.folder_id !== undefined ? body.folder_id : undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 3. Map DB model to output DTO, converting all dates to proper ISO string (never Date)
  return {
    id: updated.id,
    product_id: updated.product_id,
    label: updated.label ?? undefined,
    folder_id: updated.folder_id ?? undefined,
    snapshot_id: updated.snapshot_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
