import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Register a new product with all required business and commerce attributes.
 *
 * Creates a new product in the system, registering all core business and
 * commerce attributes for later management, listing, and analytics. The product
 * is added to the shopping_mall_ai_backend_products table, and initial values
 * for title, slug, type, status, and quantity limits must be provided. Supports
 * admin and seller access for product onboarding.
 *
 * @param props - Request properties
 * @param props.seller - Seller authentication payload (must be a registered and
 *   active seller)
 * @param props.body - Product business and commerce details (title, slug, type,
 *   status, quantity, etc)
 * @returns The full detail record of the newly created product
 * @throws {Error} If the slug is not unique or other business constraint is
 *   violated (Prisma will throw, upstream must handle)
 */
export async function post__shoppingMallAiBackend_seller_products(props: {
  seller: SellerPayload;
  body: IShoppingMallAiBackendProduct.ICreate;
}): Promise<IShoppingMallAiBackendProduct> {
  const { seller, body } = props;

  // Generate timestamps and ID with ISO string (never use native Date type directly)
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_products.create({
      data: {
        id,
        title: body.title,
        slug: body.slug,
        description: body.description ?? null,
        product_type: body.product_type,
        business_status: body.business_status,
        min_order_quantity: body.min_order_quantity,
        max_order_quantity: body.max_order_quantity,
        tax_code: body.tax_code,
        sort_priority: body.sort_priority,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    title: created.title,
    slug: created.slug,
    description: created.description ?? null,
    product_type: created.product_type,
    business_status: created.business_status,
    min_order_quantity: created.min_order_quantity,
    max_order_quantity: created.max_order_quantity,
    tax_code: created.tax_code,
    sort_priority: created.sort_priority,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
