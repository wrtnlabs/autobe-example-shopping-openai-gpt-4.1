import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Register a new product with all required business and commerce attributes.
 *
 * This endpoint allows a system administrator to onboard a new catalog product
 * to the commerce platform. All business fields (title, slug, type, status,
 * quantity limits, tax code and sort priority) must be present and valid.
 * Enforces slug uniqueness (platform-wide). On success, returns the full
 * product detail for the new product.
 *
 * @param props - Request properties
 * @param props.admin - Admin payload (validated via authentication decorator)
 * @param props.body - Product creation input (business/commercial fields)
 * @returns The newly created product record with all fields populated
 * @throws {Error} If the slug is already used (uniqueness violation)
 * @throws {Error} For unexpected database or system errors
 */
export async function post__shoppingMallAiBackend_admin_products(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendProduct.ICreate;
}): Promise<IShoppingMallAiBackendProduct> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  let created;
  try {
    created = await MyGlobal.prisma.shopping_mall_ai_backend_products.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        title: props.body.title,
        slug: props.body.slug,
        description:
          props.body.description !== undefined ? props.body.description : null,
        product_type: props.body.product_type,
        business_status: props.body.business_status,
        min_order_quantity: props.body.min_order_quantity,
        max_order_quantity: props.body.max_order_quantity,
        tax_code: props.body.tax_code,
        sort_priority: props.body.sort_priority,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      Array.isArray(err.meta?.target) &&
      err.meta.target.includes("slug")
    ) {
      throw new Error("Product slug must be unique.");
    }
    throw err;
  }
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
