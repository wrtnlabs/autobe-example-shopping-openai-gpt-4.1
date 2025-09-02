import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new inventory record for a product.
 *
 * Adds a new inventory record for a specific product in the
 * shopping_mall_ai_backend_product_inventories table. Used for stock
 * initialization and adding SKUs/bundles, and requires admin privileges.
 * Returns the new inventory record associated with the given product for
 * confirmation.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin user performing the operation
 * @param props.productId - Unique identifier for the product to add inventory
 *   to
 * @param props.body - Inventory record creation payload (available, reserved
 *   quantity, inventory status, last_update_at)
 * @returns The newly created inventory record
 * @throws {Error} When the referenced product does not exist
 */
export async function post__shoppingMallAiBackend_admin_products_$productId_inventories(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductInventory.ICreate;
}): Promise<IShoppingMallAiBackendProductInventory> {
  const { admin, productId, body } = props;

  // Ensure the referenced product exists
  const product =
    await MyGlobal.prisma.shopping_mall_ai_backend_products.findUnique({
      where: { id: productId },
      select: { id: true },
    });
  if (!product) {
    throw new Error("Product does not exist");
  }

  // Create inventory record
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_inventories.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_ai_backend_products_id: productId,
        available_quantity: body.available_quantity,
        reserved_quantity: body.reserved_quantity,
        last_update_at: body.last_update_at, // Already string & tags.Format<'date-time'> from DTO
        inventory_status: body.inventory_status,
      },
    });
  // Convert last_update_at to string & tags.Format<'date-time'>
  return {
    id: created.id,
    shopping_mall_ai_backend_products_id:
      created.shopping_mall_ai_backend_products_id,
    available_quantity: created.available_quantity,
    reserved_quantity: created.reserved_quantity,
    last_update_at: toISOStringSafe(created.last_update_at),
    inventory_status: created.inventory_status,
  };
}
