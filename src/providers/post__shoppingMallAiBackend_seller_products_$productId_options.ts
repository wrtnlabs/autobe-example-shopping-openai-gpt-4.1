import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptions";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Create a new product option group for a specific product.
 *
 * This operation inserts a new option group into the
 * shopping_mall_ai_backend_product_options table, ensuring uniqueness of
 * option_name per product and proper audit-trail metadata. Used by sellers to
 * introduce configurable attributes (e.g., color, size) to their product
 * listings. Business logic prevents duplicate option names for the same product
 * (active/not deleted). Each insert is tracked for compliance, evidence, and
 * supports future rollback by audit.
 *
 * @param props - Request properties
 * @param props.seller - The authenticated seller attempting the creation
 * @param props.productId - The product UUID for which to create the option
 *   group
 * @param props.body - The new option group specification (option_name, required
 *   flag, sort order)
 * @returns The created product option group (all fields)
 * @throws {Error} When a duplicate option_name exists for this product (option
 *   group names must be unique per product)
 */
export async function post__shoppingMallAiBackend_seller_products_$productId_options(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductOptions.ICreate;
}): Promise<IShoppingMallAiBackendProductOptions> {
  const { seller, productId, body } = props;

  // Business rule: Enforce uniqueness constraint for option_name within product (soft-deleted ignored)
  const duplicate =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_options.findFirst({
      where: {
        shopping_mall_ai_backend_products_id: productId,
        option_name: body.option_name,
        deleted_at: null,
      },
    });
  if (duplicate) {
    throw new Error("Option with this name already exists for this product");
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_options.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_ai_backend_products_id: productId,
        option_name: body.option_name,
        required: body.required,
        sort_order: body.sort_order,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    shopping_mall_ai_backend_products_id:
      created.shopping_mall_ai_backend_products_id,
    option_name: created.option_name,
    required: created.required,
    sort_order: created.sort_order,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
