import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesAddress";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve a specific favorite address with snapshot and metadata
 * (ai_commerce_favorites_addresses).
 *
 * Fetch the detailed information for a user's favorite address, including all
 * snapshot metadata, folder assignment, label, and primary status. This
 * operation ensures the authenticated seller owns the favorite and that the
 * record is not soft-deleted. All date-time fields are returned as branded ISO
 * strings, and null/undefined handling matches the API contract.
 *
 * @param props - Object containing authentication and path parameter.
 * @param props.seller - Authenticated seller payload.
 * @param props.favoriteAddressId - Unique identifier for the favorite address
 *   record.
 * @returns The detailed favorite address with snapshot and organization fields.
 * @throws {Error} When the favorite record does not exist or does not belong to
 *   the authenticated seller.
 */
export async function getaiCommerceSellerFavoritesAddressesFavoriteAddressId(props: {
  seller: SellerPayload;
  favoriteAddressId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceFavoritesAddress> {
  const { seller, favoriteAddressId } = props;

  const row = await MyGlobal.prisma.ai_commerce_favorites_addresses.findFirst({
    where: {
      id: favoriteAddressId,
      user_id: seller.id,
      deleted_at: null,
    },
  });

  if (!row) {
    throw new Error("Favorite address not found or not authorized.");
  }

  return {
    id: row.id,
    user_id: row.user_id,
    address_id: row.address_id,
    folder_id: typeof row.folder_id === "string" ? row.folder_id : undefined,
    snapshot_id: row.snapshot_id,
    label: typeof row.label === "string" ? row.label : undefined,
    primary: row.primary,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  };
}
