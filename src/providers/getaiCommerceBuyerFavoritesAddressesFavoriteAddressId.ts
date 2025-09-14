import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesAddress";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Retrieve a specific favorite address with snapshot and metadata
 * (ai_commerce_favorites_addresses).
 *
 * Fetch the detailed information for a user's favorite address, including all
 * snapshot metadata, folder assignment, label, and primary status. Ownership is
 * verified before return, and all fields are returned with precise
 * null/undefined/date-time handling as per the DTO.
 *
 * Security: Only the buyer who owns the favorite can access the result.
 * Unauthorized or non-existent records will cause an error.
 *
 * @param props - Properties for the operation
 * @param props.buyer - Authenticated buyer payload
 * @param props.favoriteAddressId - UUID for the favorite address to lookup
 * @returns Full favorite address entity with snapshot info and audit fields
 * @throws Error If the record does not exist or does not belong to the user
 */
export async function getaiCommerceBuyerFavoritesAddressesFavoriteAddressId(props: {
  buyer: BuyerPayload;
  favoriteAddressId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceFavoritesAddress> {
  const { buyer, favoriteAddressId } = props;
  const record =
    await MyGlobal.prisma.ai_commerce_favorites_addresses.findFirst({
      where: {
        id: favoriteAddressId,
        user_id: buyer.id,
      },
    });
  if (!record) {
    throw new Error("Favorite address not found or forbidden");
  }
  return {
    id: record.id,
    user_id: record.user_id,
    address_id: record.address_id,
    folder_id: record.folder_id === null ? undefined : record.folder_id,
    snapshot_id: record.snapshot_id,
    label: record.label === null ? undefined : record.label,
    primary: record.primary,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null
        ? undefined
        : toISOStringSafe(record.deleted_at),
  };
}
