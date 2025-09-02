import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Delete a specific product inventory record by inventoryId and productId.
 *
 * This operation permanently deletes a product inventory record from the
 * ShoppingMallAiBackend system. It verifies that the specified inventory exists
 * and is associated with the given product. Authorization is performed for an
 * authenticated seller, but actual seller/product ownership cannot be checked
 * due to absence of a seller_id or equivalent ownership field in the current
 * schema. Attempts to delete a nonexistent or mismatched inventory will throw
 * an error. Deletion is immediate (hard delete) since no soft-delete field
 * exists on the inventory table.
 *
 * @param props - Object containing seller authentication (SellerPayload),
 *   productId, and inventoryId.
 * @param props.seller - The authenticated seller attempting inventory deletion.
 * @param props.productId - The product UUID for which the inventory is to be
 *   deleted.
 * @param props.inventoryId - The inventory record UUID to be deleted.
 * @returns Void
 * @throws {Error} If the inventory does not exist or does not belong to the
 *   specified product.
 */
export async function delete__shoppingMallAiBackend_seller_products_$productId_inventories_$inventoryId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  inventoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, productId, inventoryId } = props;

  // Fetch the inventory by ID and enforce product association
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
    throw new Error(
      "Inventory record not found or does not belong to the specified product",
    );
  }

  // NOTE: Cannot enforce seller ownership, as schema lacks seller_id or ownership information on product/inventory.

  // Hard-delete inventory record
  await MyGlobal.prisma.shopping_mall_ai_backend_product_inventories.delete({
    where: { id: inventoryId },
  });
}
