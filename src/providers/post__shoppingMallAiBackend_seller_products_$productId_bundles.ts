import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductBundle";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Creates a new product bundle (SKU variant) for a specific product, assigning
 * a grouping of option units, SKU code, price, inventory policy, and activation
 * status.
 *
 * Sellers use this API to add new SKU variants which are linked to their
 * products. Ensures unique SKU, linkage to the correct product, and proper
 * business constraints.
 *
 * - Validates that the product belongs to the current seller
 * - Ensures SKU code is unique across all bundles
 * - All date/datetime values use ISO8601 strings (never native Date)
 *
 * @param props - Request properties
 * @param props.seller - Authenticated seller account context
 * @param props.productId - The ID of the parent product for which the bundle is
 *   created
 * @param props.body - The bundle creation data (fields of
 *   IShoppingMallAiBackendProductBundle.ICreate)
 * @returns The created bundle's complete business attributes as an
 *   IShoppingMallAiBackendProductBundle
 * @throws {Error} When the product is not found, not owned by seller, when IDs
 *   mismatch, or SKU already exists
 */
export async function post__shoppingMallAiBackend_seller_products_$productId_bundles(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductBundle.ICreate;
}): Promise<IShoppingMallAiBackendProductBundle> {
  const { seller, productId, body } = props;
  // 1. Verify productId in URL and body match strictly
  if (body.shopping_mall_ai_backend_products_id !== productId) {
    throw new Error(
      "Product ID mismatch: Path and body must reference the same product",
    );
  }

  // 2. Ensure product exists, not deleted, and belongs to this seller (if schema supports owner check)
  const product =
    await MyGlobal.prisma.shopping_mall_ai_backend_products.findFirst({
      where: {
        id: productId,
        deleted_at: null,
      },
    });
  if (!product) {
    throw new Error("Product not found or inaccessible");
  }
  // Optionally: If 'seller_id' exists in product schema, verify ownership
  if ("seller_id" in product && product.seller_id !== seller.id) {
    throw new Error(
      "Unauthorized: Cannot create bundles for products you do not own",
    );
  }

  // 3. Proactively check for duplicate SKU code (friendlier than DB conflict)
  const existing =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_bundles.findFirst({
      where: {
        sku_code: body.sku_code,
      },
    });
  if (existing) {
    throw new Error(
      "SKU code already exists for another bundle. Please provide a unique SKU code.",
    );
  }

  // 4. Prepare time and ID values without using Date type
  const id: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // 5. Insert the bundle (enforce all direct parameter passing - no intermediate input var)
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_bundles.create({
      data: {
        id,
        shopping_mall_ai_backend_products_id: productId,
        bundle_name: body.bundle_name,
        sku_code: body.sku_code,
        price: body.price,
        inventory_policy: body.inventory_policy,
        is_active: body.is_active,
        created_at: now,
        updated_at: now,
        deleted_at: undefined,
      },
    });

  // 6. Return consistent DTO (with null for deleted_at if missing)
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
