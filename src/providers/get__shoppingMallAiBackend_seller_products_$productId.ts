import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve detailed business and commerce information for a single product by
 * ID.
 *
 * Provides complete business, inventory, and commerce field values for a
 * specific product identified by productId. All core attributes (title, slug,
 * description, type, status, tax, quantity limits, timestamps) are included for
 * use in management UI, analytics, or cross-entity reference.
 *
 * Access is available to administrators and sellers (with filtering if not
 * owner or privilege scoped). This endpoint is critical for product detail
 * management, update logic, and displaying individual product cards in B2B/B2C
 * UI flows.
 *
 * @param props - Request properties
 * @param props.seller - The authenticated seller making the request
 * @param props.productId - The UUID of the product to retrieve
 * @returns Product business and commerce details, strictly matching the DTO
 * @throws {Error} When no product is found for the given ID, or if product is
 *   deleted
 */
export async function get__shoppingMallAiBackend_seller_products_$productId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendProduct> {
  const { productId } = props;
  const product =
    await MyGlobal.prisma.shopping_mall_ai_backend_products.findFirst({
      where: {
        id: productId,
        deleted_at: null,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        product_type: true,
        business_status: true,
        min_order_quantity: true,
        max_order_quantity: true,
        tax_code: true,
        sort_priority: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!product) throw new Error("Product not found");
  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    description: product.description ?? undefined,
    product_type: product.product_type,
    business_status: product.business_status,
    min_order_quantity: product.min_order_quantity,
    max_order_quantity: product.max_order_quantity,
    tax_code: product.tax_code,
    sort_priority: product.sort_priority,
    created_at: toISOStringSafe(product.created_at),
    updated_at: toISOStringSafe(product.updated_at),
    deleted_at: product.deleted_at
      ? toISOStringSafe(product.deleted_at)
      : undefined,
  };
}
