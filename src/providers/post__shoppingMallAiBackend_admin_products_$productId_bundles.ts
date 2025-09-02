import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductBundle";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new product bundle (SKU variant) for a specific product.
 *
 * This endpoint allows an authenticated admin to register a new bundle (SKU
 * variant) for a given product, assigning its grouping of option units, SKU
 * code, price, inventory policy, and activation status. All business
 * constraints are validated including existence of the parent product and
 * uniqueness of the SKU code. The operation is fully audit logged for
 * compliance and future reference.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user making the request
 * @param props.productId - UUID of the parent product for which to create the
 *   bundle
 * @param props.body - Input data for bundle creation: option unit selection,
 *   SKU code, price, policy, activation flag
 * @returns The newly created bundle with detailed business attributes
 * @throws {Error} If the product does not exist
 * @throws {Error} If a bundle with the same SKU code already exists
 */
export async function post__shoppingMallAiBackend_admin_products_$productId_bundles(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductBundle.ICreate;
}): Promise<IShoppingMallAiBackendProductBundle> {
  const { admin, productId, body } = props;

  // Step 1: Verify that the parent product exists
  const product =
    await MyGlobal.prisma.shopping_mall_ai_backend_products.findUnique({
      where: { id: productId },
    });
  if (!product) throw new Error("Product not found");

  // Step 2: Pre-check for unique SKU code (provides user-friendly error)
  const duplicate =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_bundles.findUnique({
      where: { sku_code: body.sku_code },
    });
  if (duplicate)
    throw new Error("A product bundle with the same SKU code already exists");

  // Step 3: Create the new product bundle
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_bundles.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_ai_backend_products_id: productId,
        bundle_name: body.bundle_name,
        sku_code: body.sku_code,
        price: body.price,
        inventory_policy: body.inventory_policy,
        is_active: body.is_active,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Step 4: Assemble response object, enforcing API typing and correct date/string formatting
  return {
    id: created.id,
    shopping_mall_ai_backend_products_id:
      created.shopping_mall_ai_backend_products_id,
    bundle_name: created.bundle_name,
    sku_code: created.sku_code,
    price: created.price,
    inventory_policy: created.inventory_policy,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
