import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update a specific inventory record of a product by IDs.
 *
 * This endpoint updates an inventory record for a specific product. Editable
 * fields include quantities, inventory_status, and last_update_at. Both
 * productId and inventoryId are required, and operations are subject to access
 * control (admin/seller only) and data integrity checks.
 *
 * Primarily used for inventory corrections, returns, or batch stock
 * adjustments. Successful updates return the updated inventory record. Failure
 * states (such as ID constraint violation or not found) are reported with
 * descriptive error messages for remediation. This is a key operation in
 * advanced stock and warehouse management flows.
 *
 * @param props - Request properties including seller auth, productId,
 *   inventoryId, and inventory update fields
 * @param props.seller - The authenticated seller performing the update
 *   (authorization enforced at decorator/controller layer but not further
 *   checked because the products schema has NO seller_id linkage!)
 * @param props.productId - Unique identifier for the product to which the
 *   inventory belongs.
 * @param props.inventoryId - Unique identifier for the inventory record to
 *   update.
 * @param props.body - The patch object for inventory update (may include
 *   available_quantity, reserved_quantity, inventory_status, last_update_at)
 * @returns The updated inventory record.
 * @throws {Error} If the inventory is not found, or does not belong to the
 *   given productId.
 */
export async function put__shoppingMallAiBackend_seller_products_$productId_inventories_$inventoryId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  inventoryId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductInventory.IUpdate;
}): Promise<IShoppingMallAiBackendProductInventory> {
  const { productId, inventoryId, body } = props;

  // 1. Find inventory (must belong to productId)
  const inventory =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_inventories.findUnique(
      {
        where: { id: inventoryId },
      },
    );
  if (
    !inventory ||
    inventory.shopping_mall_ai_backend_products_id !== productId
  ) {
    throw new Error("Inventory not found for given product");
  }

  // 2. Update only allowed fields
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_inventories.update({
      where: { id: inventoryId },
      data: {
        available_quantity: body.available_quantity ?? undefined,
        reserved_quantity: body.reserved_quantity ?? undefined,
        last_update_at: body.last_update_at
          ? toISOStringSafe(body.last_update_at)
          : undefined,
        inventory_status: body.inventory_status ?? undefined,
      },
    });

  // 3. Return with strict date branding
  return {
    id: updated.id,
    shopping_mall_ai_backend_products_id:
      updated.shopping_mall_ai_backend_products_id,
    available_quantity: updated.available_quantity,
    reserved_quantity: updated.reserved_quantity,
    last_update_at: toISOStringSafe(updated.last_update_at),
    inventory_status: updated.inventory_status,
  };
}
