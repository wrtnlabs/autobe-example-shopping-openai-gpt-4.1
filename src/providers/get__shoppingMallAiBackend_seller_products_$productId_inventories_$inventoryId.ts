import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve a specific inventory record of a product by IDs.
 *
 * This endpoint provides detailed information about a single inventory record
 * for a given product, such as available and reserved quantity, inventory
 * status, and the last time the inventory record was updated. Both the
 * productId and inventoryId must be provided.
 *
 * The operation is used by sellers for real-time stock validation, SKU or
 * bundle fulfillment status reporting, and inventory analytics.
 *
 * @param props - Request properties
 * @param props.seller - Authenticated seller performing the operation
 * @param props.productId - UUID of the product to which the inventory belongs
 * @param props.inventoryId - UUID of the inventory record to retrieve
 * @returns Detailed information about the inventory record
 * @throws {Error} When no inventory is found matching the given productId and
 *   inventoryId
 */
export async function get__shoppingMallAiBackend_seller_products_$productId_inventories_$inventoryId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  inventoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendProductInventory> {
  const { seller, productId, inventoryId } = props;
  const inventory =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_inventories.findFirst(
      {
        where: {
          id: inventoryId,
          shopping_mall_ai_backend_products_id: productId,
        },
        select: {
          id: true,
          shopping_mall_ai_backend_products_id: true,
          available_quantity: true,
          reserved_quantity: true,
          last_update_at: true,
          inventory_status: true,
        },
      },
    );
  if (!inventory) {
    throw new Error("Inventory not found for given productId and inventoryId");
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
