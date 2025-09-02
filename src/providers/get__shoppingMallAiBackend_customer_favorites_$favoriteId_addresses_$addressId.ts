import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavoriteAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteAddress";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieves detailed information about a single favorited address record
 * associated with the customer's favorites folder/group.
 *
 * Returns address snapshot details at the time of favoriting. Used for
 * drill-down or details-by-click in the customer's favorites list.
 *
 * The function checks both the favorite and address association and ensures the
 * customer is the rightful owner of the mapping. If the mapping can't be found
 * or the customer is not the owner, throws an error.
 *
 * @param props - Request parameters
 * @param props.customer - The currently authenticated customer payload
 * @param props.favoriteId - Globally unique identifier of the parent favorite
 *   group or folder
 * @param props.addressId - Globally unique identifier of the favorited address
 *   entry
 * @returns Favorited address snapshot data at the time of favoriting
 * @throws {Error} If the favorite address record does not exist or the customer
 *   doesn't have access
 */
export async function get__shoppingMallAiBackend_customer_favorites_$favoriteId_addresses_$addressId(props: {
  customer: CustomerPayload;
  favoriteId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendFavoriteAddress> {
  const { customer, favoriteId, addressId } = props;
  const record =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorite_addresses.findFirst(
      {
        where: {
          id: addressId,
          shopping_mall_ai_backend_favorite_id: favoriteId,
          shopping_mall_ai_backend_customer_id: customer.id,
        },
      },
    );
  if (!record) {
    throw new Error("Favorite address not found or access denied");
  }
  return {
    id: record.id,
    shopping_mall_ai_backend_favorite_id:
      record.shopping_mall_ai_backend_favorite_id,
    shopping_mall_ai_backend_customer_id:
      record.shopping_mall_ai_backend_customer_id,
    address_snapshot: record.address_snapshot ?? null,
    created_at: toISOStringSafe(record.created_at),
  };
}
