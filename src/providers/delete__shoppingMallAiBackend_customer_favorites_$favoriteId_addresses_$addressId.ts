import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Delete a customer's favorited address from their favorites list.
 *
 * Removes a specific address from the user's favorites, targeting the favorite
 * address entity by both favoriteId (favorite bookmark) and addressId (delivery
 * address) identifiers.
 *
 * This operation permanently deletes the favorite address record, ensuring user
 * autonomy over address management and keeping the favorites list up to date.
 * Only authenticated customers may delete their own favorited addresses. The
 * operation references the 'shopping_mall_ai_backend_favorite_addresses' table,
 * which stores evidence of when an address was favorited for personalized
 * checkout flows and notification triggers.
 *
 * Additional security checks ensure that attempting to delete addresses not
 * belonging to the authenticated customer results in a permission error. The
 * business logic includes audit trail preservation for evidence requirements,
 * as mandated by compliance guidelines.
 *
 * No response body is returned for successful deletion to keep the API
 * lightweight; success may be indicated by an HTTP 204 status code. Attempting
 * to delete a non-existent favorite or address yields a suitable error
 * message.
 *
 * @param props - Request properties
 * @param props.customer - Authenticated customer payload
 * @param props.favoriteId - The unique identifier (UUID) of the favorite entity
 *   associated with the address to delete
 * @param props.addressId - The unique identifier (UUID) of the address to be
 *   removed from favorites
 * @returns Void
 * @throws {Error} When the favorite address does not exist or does not belong
 *   to the authenticated customer
 */
export async function delete__shoppingMallAiBackend_customer_favorites_$favoriteId_addresses_$addressId(props: {
  customer: CustomerPayload;
  favoriteId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, favoriteId, addressId } = props;

  // Find the favorite address record by PK (id=addressId) and favorite ID
  const favoriteAddress =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorite_addresses.findFirst(
      {
        where: {
          id: addressId,
          shopping_mall_ai_backend_favorite_id: favoriteId,
        },
      },
    );

  // If not found, error
  if (!favoriteAddress) {
    throw new Error("Favorite address not found.");
  }

  // Only the owner may delete
  if (favoriteAddress.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error("You are not authorized to delete this favorite address.");
  }

  // Hard delete the record
  await MyGlobal.prisma.shopping_mall_ai_backend_favorite_addresses.delete({
    where: {
      id: addressId,
    },
  });
}
