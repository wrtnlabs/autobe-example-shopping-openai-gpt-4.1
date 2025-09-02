import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Create a new inventory record for a specific product.
 *
 * This API adds a new inventory record for a specific product, supporting stock
 * initialization and adding SKUs/bundles to the inventory system. Required
 * fields include available_quantity, reserved_quantity, inventory_status, and
 * last_update_at. The linkage to the product is made with productId.
 *
 * Both sellers and admins can perform this operation, typically during catalog
 * setup or expansion of available SKUs. The API checks data integrity
 * constraints and ensures accurate linkage to the parent product. Error
 * conditions such as product non-existence or data violations are communicated
 * clearly in responses.
 *
 * @param props - Request properties
 * @param props.seller - Authenticated seller performing the operation
 * @param props.productId - Unique identifier (uuid) for the product being
 *   inventoried
 * @param props.body - Inventory registration payload (quantities, status,
 *   updated timestamp)
 * @returns Newly created inventory record as confirmation
 * @throws {Error} When the product does not exist or is soft deleted
 */
export async function post__shoppingMallAiBackend_seller_products_$productId_inventories(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductInventory.ICreate;
}): Promise<IShoppingMallAiBackendProductInventory> {
  const { seller, productId, body } = props;

  // Confirm the product exists and is not soft deleted
  const product =
    await MyGlobal.prisma.shopping_mall_ai_backend_products.findFirst({
      where: {
        id: productId,
        deleted_at: null,
      },
    });
  if (!product) {
    throw new Error("Product not found");
  }

  // Insert new inventory record for the product
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_inventories.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_ai_backend_products_id: productId,
        available_quantity: body.available_quantity,
        reserved_quantity: body.reserved_quantity,
        last_update_at: toISOStringSafe(body.last_update_at),
        inventory_status: body.inventory_status,
      },
    });

  // Return as API DTO (with all primitive field types, branded as needed)
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
