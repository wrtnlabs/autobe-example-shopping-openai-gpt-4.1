import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesAddress";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Add a new favorite address for the current seller
 * (ai_commerce_favorites_addresses).
 *
 * This creates a favorite for a user address, enforcing ownership, duplicate
 * prevention, and audit snapshot creation. Snapshots guarantee evidence for
 * compliance. Attempts to favorite an address the user does not own, a deleted
 * address, or duplicate an active favorite result in an error.
 *
 * @param props - Input object
 * @param props.seller - The authenticated seller payload (must match favorite's
 *   user_id)
 * @param props.body - Address favorite creation request body (see
 *   IAiCommerceFavoritesAddress.ICreate)
 * @returns The newly created IAiCommerceFavoritesAddress entry.
 * @throws {Error} If address does not exist, is deleted, not owned by user, or
 *   is already favorited
 */
export async function postaiCommerceSellerFavoritesAddresses(props: {
  seller: SellerPayload;
  body: IAiCommerceFavoritesAddress.ICreate;
}): Promise<IAiCommerceFavoritesAddress> {
  const { seller, body } = props;

  // Validate address ownership and status
  const address = await MyGlobal.prisma.ai_commerce_user_addresses.findFirst({
    where: {
      id: body.address_id,
      buyer_id: seller.id,
      deleted_at: null,
    },
  });
  if (!address) {
    throw new Error("Address not found or does not belong to user");
  }

  // Prevent duplicate favoriting
  const existingFavorite =
    await MyGlobal.prisma.ai_commerce_favorites_addresses.findFirst({
      where: {
        user_id: seller.id,
        address_id: body.address_id,
        deleted_at: null,
      },
    });
  if (existingFavorite) {
    throw new Error("Address already favorited");
  }

  // Prepare snapshot data (some fields must be empty string due to missing info)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const snapshot_id: string & tags.Format<"uuid"> = v4();

  await MyGlobal.prisma.ai_commerce_favorites_address_snapshots.create({
    data: {
      id: snapshot_id,
      address_id: address.id,
      country_code: address.country_code,
      city: address.city,
      postal_code: address.postal_code,
      line1: address.address_line_1,
      line2: address.address_line_2 ?? null,
      recipient_name: "", // No recipient info in schema
      phone: "", // No phone info in schema
      snapshot_date: now,
    },
  });

  // Insert favorite address record
  const favorite_id: string & tags.Format<"uuid"> = v4();
  const created = await MyGlobal.prisma.ai_commerce_favorites_addresses.create({
    data: {
      id: favorite_id,
      user_id: seller.id,
      address_id: address.id,
      folder_id: body.folder_id !== undefined ? body.folder_id : null,
      snapshot_id,
      label: body.label !== undefined ? body.label : null,
      primary: typeof body.primary === "boolean" ? body.primary : false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Format output exactly per IAiCommerceFavoritesAddress type (handle nulls/undefined vs optional as required)
  return {
    id: created.id,
    user_id: created.user_id,
    address_id: created.address_id,
    snapshot_id: created.snapshot_id,
    folder_id: created.folder_id !== undefined ? created.folder_id : undefined,
    label: created.label !== undefined ? created.label : undefined,
    primary: created.primary,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at:
      created.deleted_at !== undefined ? created.deleted_at : undefined,
  };
}
