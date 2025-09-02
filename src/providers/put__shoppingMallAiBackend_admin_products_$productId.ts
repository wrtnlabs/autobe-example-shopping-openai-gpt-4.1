import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update all mutable fields for a specific product, triggering a business/audit
 * snapshot.
 *
 * Enables authorized admins to update the core business, status, or
 * commerce-related attributes of a single product in the
 * shopping_mall_ai_backend_products table. All date/datetime values are
 * returned as string & tags.Format<'date-time'>. No use of Date type or 'as'
 * assertions in the implementation.
 *
 * @param props - Object containing the authenticated admin (AdminPayload),
 *   productId, and update body
 * @param props.admin - Authenticated admin context (already validated)
 * @param props.productId - Product UUID to update
 * @param props.body - Updated business, status, or commerce attributes (all
 *   optional)
 * @returns The updated product, all date fields as ISO 8601 branded strings
 * @throws {Error} If the product does not exist
 * @throws {Error} If the slug is updated to a duplicate value
 */
export async function put__shoppingMallAiBackend_admin_products_$productId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProduct.IUpdate;
}): Promise<IShoppingMallAiBackendProduct> {
  const { admin, productId, body } = props;

  const existing =
    await MyGlobal.prisma.shopping_mall_ai_backend_products.findUnique({
      where: { id: productId },
    });
  if (existing === null) throw new Error("Product not found");

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  let updated: typeof existing;
  try {
    updated = await MyGlobal.prisma.shopping_mall_ai_backend_products.update({
      where: { id: productId },
      data: {
        title: body.title ?? undefined,
        slug: body.slug ?? undefined,
        description: body.description ?? undefined,
        product_type: body.product_type ?? undefined,
        business_status: body.business_status ?? undefined,
        min_order_quantity: body.min_order_quantity ?? undefined,
        max_order_quantity: body.max_order_quantity ?? undefined,
        tax_code: body.tax_code ?? undefined,
        sort_priority: body.sort_priority ?? undefined,
        updated_at: now,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error("Unique constraint failed on slug");
    }
    throw err;
  }

  return {
    id: updated.id,
    title: updated.title,
    slug: updated.slug,
    description: updated.description ?? null,
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
