import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves the details of a specific inventory record associated with a
 * product from the shopping_mall_ai_backend_product_inventories table.
 *
 * This operation returns available and reserved quantity, inventory status, and
 * last update time for the SKU or bundle. Used for real-time stock visibility,
 * fulfillment operations, and analytics. Both inventoryId and productId are
 * required parameters, and admin authentication is enforced.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making the request
 * @param props.productId - The unique identifier for the product to which the
 *   inventory belongs
 * @param props.inventoryId - The unique identifier for the inventory record to
 *   retrieve
 * @returns Detailed information about the inventory record as
 *   IShoppingMallAiBackendProductInventory
 * @throws {Error} When the inventory record is not found or does not belong to
 *   the specified product
 */
export async function get__shoppingMallAiBackend_admin_products_$productId_inventories_$inventoryId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  inventoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendProductInventory> {
  const { admin, productId, inventoryId } = props;

  const inventory =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_inventories.findFirst(
      {
        where: {
          id: inventoryId,
          shopping_mall_ai_backend_products_id: productId,
        },
      },
    );

  if (!inventory) {
    throw new Error("Inventory not found for this product");
  }

  return {
    id: inventory.id,
    shopping_mall_ai_backend_products_id:
      inventory.shopping_mall_ai_backend_products_id,
    available_quantity: inventory.available_quantity,
    reserved_quantity: inventory.reserved_quantity,
    last_update_at: toISOStringSafe(inventory.last_update_at),
    inventory_status: inventory.inventory_status,
  };
}
