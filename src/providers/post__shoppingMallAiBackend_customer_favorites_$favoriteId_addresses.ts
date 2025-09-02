import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavoriteAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteAddress";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Add an address as a favorite for the customer in the specified group/folder.
 *
 * Allows the customer to favorite a new address in the given group/folder,
 * establishing a link and storing an address snapshot. If the mapping already
 * exists, returns the existing record. All audit fields such as creation time
 * are included. Only authorized customers may insert into their own favorite
 * sets.
 *
 * @param props - Request properties
 * @param props.customer - Authenticated customer performing the operation
 * @param props.favoriteId - UUID of the favorite group/folder for the address
 * @param props.body - Creation info for favorite address link (must include
 *   address reference)
 * @returns The favorited address record, including audit fields
 * @throws {Error} When the favorite group does not exist, is deleted, or is not
 *   owned by the customer
 * @throws {Error} When duplication is detected (address already mapped in this
 *   group/folder for this customer)
 * @throws {Error} On any internal database error or unexpected failure
 */
export async function post__shoppingMallAiBackend_customer_favorites_$favoriteId_addresses(props: {
  customer: CustomerPayload;
  favoriteId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendFavoriteAddress.ICreate;
}): Promise<IShoppingMallAiBackendFavoriteAddress> {
  const { customer, favoriteId, body } = props;

  // 1. Validate favorite group ownership (must belong to customer)
  const favorite =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorites.findFirst({
      where: {
        id: favoriteId,
        shopping_mall_ai_backend_customer_id: customer.id,
        deleted_at: null,
      },
    });
  if (!favorite) {
    throw new Error(
      "Favorite group not found, deleted, or does not belong to customer",
    );
  }

  // 2. Check for existing mapping (same folder/group, customer, snapshot)
  const existing =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorite_addresses.findFirst(
      {
        where: {
          shopping_mall_ai_backend_favorite_id: favoriteId,
          shopping_mall_ai_backend_customer_id: customer.id,
          address_snapshot: body.address_snapshot ?? null,
        },
      },
    );
  if (existing) {
    return {
      id: existing.id,
      shopping_mall_ai_backend_favorite_id:
        existing.shopping_mall_ai_backend_favorite_id,
      shopping_mall_ai_backend_customer_id:
        existing.shopping_mall_ai_backend_customer_id,
      address_snapshot: existing.address_snapshot ?? null,
      created_at: toISOStringSafe(existing.created_at),
    };
  }

  // 3. Create new favorite address mapping
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorite_addresses.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_ai_backend_favorite_id: favoriteId,
        shopping_mall_ai_backend_customer_id: customer.id,
        address_snapshot: body.address_snapshot ?? null,
        created_at: now,
      },
    });
  return {
    id: created.id,
    shopping_mall_ai_backend_favorite_id:
      created.shopping_mall_ai_backend_favorite_id,
    shopping_mall_ai_backend_customer_id:
      created.shopping_mall_ai_backend_customer_id,
    address_snapshot: created.address_snapshot ?? null,
    created_at: toISOStringSafe(created.created_at),
  };
}
