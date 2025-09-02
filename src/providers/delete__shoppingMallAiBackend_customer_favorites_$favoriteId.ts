import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Logically deletes a favorite item with soft-delete using the deleted_at
 * field.
 *
 * Deletes a favorite record by its unique identifier. This operation marks the
 * favorite as deleted by setting its deleted_at field, rather than permanently
 * removing the row, in accordance with compliance and logical deletion
 * requirements for personal data. It ensures auditability and allows admins to
 * investigate deleted favorites as needed. Customers may only erase favorites
 * they own, while admins have system-level permissions. If the favorite is
 * already deleted, this call is idempotent and returns success. Related child
 * mappings (e.g., favorite_products, favorite_addresses, favorite_inquiries)
 * are handled by cascade logic in the database.
 *
 * Authorization: Customers may only erase favorites they own. Throws error if
 * not found or not owned.
 *
 * @param props - Customer: Authenticated customer payload (must own the
 *   favorite) favoriteId: Globally unique identifier of the favorite to be
 *   deleted
 * @returns Void (when the operation succeeds or is idempotent)
 * @throws {Error} If the favorite does not exist or is not owned by the
 *   customer
 */
export async function delete__shoppingMallAiBackend_customer_favorites_$favoriteId(props: {
  customer: CustomerPayload;
  favoriteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, favoriteId } = props;
  const favorite =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorites.findUnique({
      where: { id: favoriteId },
    });
  if (
    !favorite ||
    favorite.shopping_mall_ai_backend_customer_id !== customer.id
  ) {
    // For privacy, do not reveal whether record exists or is simply not owned.
    throw new Error("Favorite not found or not accessible");
  }
  if (favorite.deleted_at) {
    // Already deleted (idempotency)
    return;
  }
  await MyGlobal.prisma.shopping_mall_ai_backend_favorites.update({
    where: { id: favoriteId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
