import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesAddress";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Add a new favorite address for the current user
 * (ai_commerce_favorites_addresses).
 *
 * Registers a user address as a favorite, storing a snapshot of the address
 * state and optional organizational information (folder and label). Ensures the
 * address belongs to the authenticated buyer, is not deleted, and that it is
 * not already favorited (by soft-deleted logic). On success, a snapshot is
 * created for audit; the returned result is a conforming
 * IAiCommerceFavoritesAddress.
 *
 * Authorization: Only available to buyers for their own addresses. Attempts to
 * favorite someone else's address or re-favorite the same address are rejected
 * with errors. All new entries reference the current state for snapshot
 * integrity.
 *
 * @param props - Object containing the authenticated buyer and creation payload
 * @param props.buyer - Authenticated buyer creating the favorite
 * @param props.body - Data specifying which address to favorite and optional
 *   folder/label/primary flag
 * @returns The newly created favorite address record with snapshot reference
 *   and label/folder info
 * @throws {Error} If address doesn't exist, doesn't belong to user, is deleted,
 *   or already favorited (not soft-deleted)
 */
export async function postaiCommerceBuyerFavoritesAddresses(props: {
  buyer: BuyerPayload;
  body: IAiCommerceFavoritesAddress.ICreate;
}): Promise<IAiCommerceFavoritesAddress> {
  const { buyer, body } = props;

  // Step 1: Address existence & ownership validation
  const address = await MyGlobal.prisma.ai_commerce_user_addresses.findFirst({
    where: {
      id: body.address_id,
      buyer_id: buyer.id,
      deleted_at: null,
    },
  });
  if (!address) {
    throw new Error(
      "Address does not exist, is deleted, or does not belong to this user",
    );
  }

  // Step 2: Existing favorite check (soft-active only)
  const duplicate =
    await MyGlobal.prisma.ai_commerce_favorites_addresses.findFirst({
      where: {
        user_id: buyer.id,
        address_id: body.address_id,
        deleted_at: null,
      },
    });
  if (duplicate) {
    throw new Error("You have already favorited this address");
  }

  // Step 3: Snapshot creation with current address state
  const snapshot_id = v4();
  await MyGlobal.prisma.ai_commerce_favorites_address_snapshots.create({
    data: {
      id: snapshot_id,
      address_id: address.id,
      country_code: address.country_code,
      city: address.city,
      postal_code: address.postal_code,
      line1: address.address_line_1,
      line2:
        address.address_line_2 !== undefined ? address.address_line_2 : null,
      recipient_name: "",
      phone: "",
      snapshot_date: toISOStringSafe(new Date()),
    },
  });

  // Step 4: Create the favorite record (main entity)
  const now = toISOStringSafe(new Date());
  const new_favorite =
    await MyGlobal.prisma.ai_commerce_favorites_addresses.create({
      data: {
        id: v4(),
        user_id: buyer.id,
        address_id: body.address_id,
        folder_id: body.folder_id !== undefined ? body.folder_id : null,
        snapshot_id: snapshot_id,
        label: body.label !== undefined ? body.label : null,
        primary: body.primary !== undefined ? body.primary : false,
        created_at: now,
        updated_at: now,
      },
    });

  // Build response in strict conformance to IAiCommerceFavoritesAddress
  return {
    id: new_favorite.id,
    user_id: new_favorite.user_id,
    address_id: new_favorite.address_id,
    folder_id:
      new_favorite.folder_id !== null && new_favorite.folder_id !== undefined
        ? new_favorite.folder_id
        : undefined,
    snapshot_id: new_favorite.snapshot_id,
    label:
      new_favorite.label !== null && new_favorite.label !== undefined
        ? new_favorite.label
        : undefined,
    primary: new_favorite.primary,
    created_at: toISOStringSafe(new_favorite.created_at),
    updated_at: toISOStringSafe(new_favorite.updated_at),
    deleted_at:
      new_favorite.deleted_at !== null && new_favorite.deleted_at !== undefined
        ? toISOStringSafe(new_favorite.deleted_at)
        : undefined,
  };
}
