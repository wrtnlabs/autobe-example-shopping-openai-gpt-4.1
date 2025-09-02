import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves detailed information of a single product by productId from the
 * shopping_mall_ai_backend_products table.
 *
 * Provides complete business, inventory, and commerce field values for a
 * specific product identified by productId. All core attributes (title, slug,
 * description, type, status, tax, quantity limits, timestamps) are included for
 * use in management UI, analytics, or cross-entity reference.
 *
 * Access is restricted to authenticated administrators. Throws an error if the
 * product does not exist or has been soft-deleted.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin payload (authentication and active
 *   status enforced by decorator)
 * @param props.productId - Unique identifier of the product to retrieve
 * @returns Complete detail record for specified product, suitable for
 *   management or display
 * @throws {Error} If the product is not found or has been soft deleted
 */
export async function get__shoppingMallAiBackend_admin_products_$productId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendProduct> {
  const { productId } = props;

  const product =
    await MyGlobal.prisma.shopping_mall_ai_backend_products.findFirst({
      where: {
        id: productId,
        deleted_at: null,
      },
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
    deleted_at: product.deleted_at ? toISOStringSafe(product.deleted_at) : null,
  };
}
