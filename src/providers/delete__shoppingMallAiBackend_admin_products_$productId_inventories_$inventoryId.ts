import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete a specific product inventory record by inventoryId and productId.
 *
 * Deletes a product inventory entry from the ShoppingMallAiBackend system using
 * both inventoryId and productId as identifiers. This operation permanently
 * deletes the inventory record; only admins with valid authentication may
 * perform this operation. If no such inventory record exists or the inventory
 * does not belong to the given product, an error is thrown. There is no
 * soft-delete column in the target model, so deletion is permanent. The parent
 * product remains unaffected.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing this request
 *   (AdminPayload)
 * @param props.productId - UUID of the parent product
 * @param props.inventoryId - UUID of the inventory record to delete
 * @returns Void
 * @throws {Error} If the inventory record does not exist or does not belong to
 *   the specified product
 * @throws {Error} If there is a database error while deleting the inventory
 */
export async function delete__shoppingMallAiBackend_admin_products_$productId_inventories_$inventoryId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  inventoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, productId, inventoryId } = props;

  // Ensure the inventory exists and belongs to the specified product
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
    throw new Error("Inventory not found for the given product.");
  }

  // Hard delete (no soft-delete column in this model)
  await MyGlobal.prisma.shopping_mall_ai_backend_product_inventories.delete({
    where: {
      id: inventoryId,
    },
  });
}
