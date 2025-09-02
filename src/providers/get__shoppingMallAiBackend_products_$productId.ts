import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";

/**
 * Retrieve a single product's detailed information by ID.
 *
 * Retrieves detailed information about a specific product by its unique
 * productId. Returns all business and commerce attributes defined in the
 * shopping_mall_ai_backend_products table, including title, slug, description,
 * product type, status, quantity constraints, tax code, business status, and
 * all audit/scalar properties required for front-end and management detail
 * pages. Excludes soft-deleted (deleted_at != null) entries from public view.
 * If the product is not found or is deleted, throws an error.
 *
 * @param props - Request properties
 * @param props.productId - Unique identifier of the target product to retrieve
 * @returns The detailed product record with all scalar attributes, or throws if
 *   not found or soft-deleted.
 * @throws {Error} When the product is not found (nonexistent or soft-deleted)
 */
export async function get__shoppingMallAiBackend_products_$productId(props: {
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendProduct> {
  const { productId } = props;
  const product =
    await MyGlobal.prisma.shopping_mall_ai_backend_products.findUnique({
      where: { id: productId, deleted_at: null },
    });
  if (!product) throw new Error("Product not found");
  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    description: product.description ?? null,
    product_type: product.product_type,
    business_status: product.business_status,
    min_order_quantity: product.min_order_quantity,
    max_order_quantity: product.max_order_quantity,
    tax_code: product.tax_code,
    sort_priority: product.sort_priority,
    created_at: toISOStringSafe(product.created_at),
    updated_at: toISOStringSafe(product.updated_at),
    deleted_at:
      product.deleted_at != null ? toISOStringSafe(product.deleted_at) : null,
  };
}
