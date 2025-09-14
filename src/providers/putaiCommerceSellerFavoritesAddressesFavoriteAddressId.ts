import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesAddress";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update organization or metadata of an existing favorite address
 * (ai_commerce_favorites_addresses).
 *
 * This endpoint allows an authenticated seller to update organization or
 * metadata fields (folder, label, primary) for an address favorite they own.
 * The favorite must belong to the caller's user account (seller) and must be
 * active (not deleted). Only fields present in the request body will be
 * updated. The "updated_at" field is always set.
 *
 * @param props - Request object
 * @param props.seller - Authenticated seller payload
 * @param props.favoriteAddressId - UUID of the favorite address to update
 * @param props.body - Partial update with folder_id, label, primary (see
 *   IAiCommerceFavoritesAddress.IUpdate)
 * @returns The updated IAiCommerceFavoritesAddress entity with all fields
 *   strictly typed
 * @throws {Error} If the favorite address is not found, is deleted, or is not
 *   owned by the seller
 */
export async function putaiCommerceSellerFavoritesAddressesFavoriteAddressId(props: {
  seller: SellerPayload;
  favoriteAddressId: string & tags.Format<"uuid">;
  body: IAiCommerceFavoritesAddress.IUpdate;
}): Promise<IAiCommerceFavoritesAddress> {
  const { seller, favoriteAddressId, body } = props;

  // Step 1: Ownership and Existence Check
  const favorite =
    await MyGlobal.prisma.ai_commerce_favorites_addresses.findFirst({
      where: {
        id: favoriteAddressId,
        user_id: seller.id,
        deleted_at: null,
      },
    });
  if (!favorite) {
    throw new Error(
      "Favorite address not found, not owned by seller, or has been deleted.",
    );
  }

  // Step 2: Update record (only the specified fields; always updated_at)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.ai_commerce_favorites_addresses.update({
    where: { id: favoriteAddressId },
    data: {
      folder_id: body.folder_id ?? undefined,
      label: body.label ?? undefined,
      primary: body.primary ?? undefined,
      updated_at: now,
    },
  });

  // Step 3: Map return object for DTO, processing nullability and date conversion strictly
  return {
    id: updated.id,
    user_id: updated.user_id,
    address_id: updated.address_id,
    folder_id: updated.folder_id ?? undefined,
    snapshot_id: updated.snapshot_id,
    label: updated.label ?? undefined,
    primary: updated.primary,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
