import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Updates an existing inventory record of a product in the
 * shopping_mall_ai_backend_product_inventories table.
 *
 * Allows modifying available and reserved quantities, status, and last updated
 * timestamp, subject to business and data integrity constraints. The operation
 * requires both productId and inventoryId and is restricted to admins. Used for
 * stock adjustments, corrections, or processing returns. Returns the updated
 * record upon success.
 *
 * @param props - Properties for this request
 * @param props.admin - Authenticated admin user performing the update. Must be
 *   an active, valid admin.
 * @param props.productId - Unique UUID identifier for the product to which the
 *   inventory belongs.
 * @param props.inventoryId - Unique UUID identifier for the specific inventory
 *   record
 * @param props.body - Update fields (quantities, status, last_update_at)
 * @returns The updated inventory record as per the DTO definition
 * @throws {Error} When inventory is not found, or the inventory does not belong
 *   to the specified productId.
 */
export async function put__shoppingMallAiBackend_admin_products_$productId_inventories_$inventoryId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  inventoryId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductInventory.IUpdate;
}): Promise<IShoppingMallAiBackendProductInventory> {
  const { admin, productId, inventoryId, body } = props;

  // Fetch the inventory by id
  const inventory =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_inventories.findUnique(
      {
        where: { id: inventoryId },
      },
    );
  if (!inventory) {
    throw new Error("Inventory record not found");
  }
  // Check product linkage
  if (inventory.shopping_mall_ai_backend_products_id !== productId) {
    throw new Error("Product mismatch for the inventory record");
  }
  // Update only allowed fields
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_inventories.update({
      where: { id: inventoryId },
      data: {
        available_quantity: body.available_quantity ?? undefined,
        reserved_quantity: body.reserved_quantity ?? undefined,
        last_update_at: body.last_update_at ?? undefined,
        inventory_status: body.inventory_status ?? undefined,
      },
    });

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
