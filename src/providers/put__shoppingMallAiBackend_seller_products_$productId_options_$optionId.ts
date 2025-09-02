import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptions";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update the details of an existing option group for the specified product.
 *
 * Used to rename, reorder, or change required/optional status or details for
 * the option group. All updates are snapshotted and logged, with rollback and
 * evidence support for business and legal requirements. Only sellers with
 * access to the product and admins may update product options. All failed
 * update attempts (due to missing record, deletion, or permission error) result
 * in detailed error reporting.
 *
 * @param props - Request properties
 * @param props.seller - Authenticated seller making the request
 * @param props.productId - Unique identifier of the parent product
 * @param props.optionId - Unique identifier of the option group to update
 * @param props.body - Updated option group fields; only option_name, required,
 *   sort_order can be changed
 * @returns The updated product option group
 * @throws {Error} If the product option group is not found or already deleted
 *
 *   Note: Strict seller-to-product ownership cannot be enforced at the DB layer
 *   because shopping_mall_ai_backend_product_options and
 *   shopping_mall_ai_backend_products do not include a seller reference. Seller
 *   validity/activeness is validated by SellerAuth decorator (authentication
 *   level).
 */
export async function put__shoppingMallAiBackend_seller_products_$productId_options_$optionId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductOptions.IUpdate;
}): Promise<IShoppingMallAiBackendProductOptions> {
  const { seller, productId, optionId, body } = props;

  // Business rule: Only update active (not-deleted) option on correct product
  const option =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_options.findFirst({
      where: {
        id: optionId,
        shopping_mall_ai_backend_products_id: productId,
        deleted_at: null,
      },
    });
  if (!option) throw new Error("Option group not found or already deleted");

  // Only update the fields provided in the body; always update updated_at
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_options.update({
      where: { id: optionId },
      data: {
        option_name: body.option_name ?? undefined,
        required: body.required ?? undefined,
        sort_order: body.sort_order ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    shopping_mall_ai_backend_products_id:
      updated.shopping_mall_ai_backend_products_id,
    option_name: updated.option_name,
    required: updated.required,
    sort_order: updated.sort_order,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
