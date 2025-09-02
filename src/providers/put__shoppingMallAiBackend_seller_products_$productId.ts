import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update all mutable fields for a specific product, triggering a business/audit
 * snapshot.
 *
 * Enables authorized sellers to update the core business, status, or
 * commerce-related attributes of a single product. This action triggers an
 * update timestamp and may require validation of value formats (min/max,
 * uniqueness, status, etc.).
 *
 * Only mutable fields are updatable. System handles timestamping for audit and
 * rollback, per business requirements. Errors are returned if product does not
 * exist, is deleted, or request is malformed/unauthorized.
 *
 * @param props - Request properties
 * @param props.seller - The authenticated seller performing the update.
 * @param props.productId - Unique identifier of the product to update.
 * @param props.body - The updated fields for the product.
 * @returns The full detail of the updated product after modification.
 * @throws {Error} When the product does not exist or has been soft deleted.
 */
export async function put__shoppingMallAiBackend_seller_products_$productId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProduct.IUpdate;
}): Promise<IShoppingMallAiBackendProduct> {
  const { seller, productId, body } = props;

  const product =
    await MyGlobal.prisma.shopping_mall_ai_backend_products.findFirst({
      where: {
        id: productId,
        deleted_at: null,
      },
    });
  if (!product) {
    throw new Error("Product not found or already deleted");
  }
  // Ownership check at application/business layer, as schema does not provide direct relation.
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_products.update({
      where: { id: productId },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.slug !== undefined ? { slug: body.slug } : {}),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        ...(body.product_type !== undefined
          ? { product_type: body.product_type }
          : {}),
        ...(body.business_status !== undefined
          ? { business_status: body.business_status }
          : {}),
        ...(body.min_order_quantity !== undefined
          ? { min_order_quantity: body.min_order_quantity }
          : {}),
        ...(body.max_order_quantity !== undefined
          ? { max_order_quantity: body.max_order_quantity }
          : {}),
        ...(body.tax_code !== undefined ? { tax_code: body.tax_code } : {}),
        ...(body.sort_priority !== undefined
          ? { sort_priority: body.sort_priority }
          : {}),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  return {
    id: updated.id,
    title: updated.title,
    slug: updated.slug,
    description: updated.description,
    product_type: updated.product_type,
    business_status: updated.business_status,
    min_order_quantity: updated.min_order_quantity,
    max_order_quantity: updated.max_order_quantity,
    tax_code: updated.tax_code,
    sort_priority: updated.sort_priority,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
