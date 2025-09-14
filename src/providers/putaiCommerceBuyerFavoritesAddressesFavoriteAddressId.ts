import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesAddress";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Update organization or metadata of an existing favorite address
 * (ai_commerce_favorites_addresses).
 *
 * Modifies a user's favorite address, such as moving it to a different folder,
 * changing the label, or toggling its primary status. Enforces ownership: only
 * the owning buyer can update their favorites. The updatedAt field is
 * refreshed. Business validation for folder/favorite existence and uniqueness
 * of primary are assumed enforced upstream or at the database layer. All
 * returned date/datetime values conform to string & tags.Format<'date-time'>.
 * No Date type or as assertions used.
 *
 * @param props - Request parameters
 * @param props.buyer - Authenticated buyer performing the update
 * @param props.favoriteAddressId - UUID of the favorite address to update
 * @param props.body - Fields to update (folder_id, label, primary, per DTO)
 * @returns The updated favorite address record
 * @throws {Error} If the favorite address is not found, deleted, or not owned
 *   by the buyer
 */
export async function putaiCommerceBuyerFavoritesAddressesFavoriteAddressId(props: {
  buyer: BuyerPayload;
  favoriteAddressId: string & tags.Format<"uuid">;
  body: IAiCommerceFavoritesAddress.IUpdate;
}): Promise<IAiCommerceFavoritesAddress> {
  const { buyer, favoriteAddressId, body } = props;

  // Ownership and alive check
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
      "Favorite address not found, deleted, or not owned by this user.",
    );
  }

  // Always update updated_at for audit
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.ai_commerce_favorites_addresses.update({
    where: { id: favoriteAddressId },
    data: {
      ...(body.folder_id !== undefined && { folder_id: body.folder_id }),
      ...(body.label !== undefined && { label: body.label }),
      ...(body.primary !== undefined && { primary: body.primary }),
      updated_at: now,
    },
  });

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
