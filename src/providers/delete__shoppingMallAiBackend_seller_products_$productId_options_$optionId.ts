import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Soft-deletes a product option group by setting its deleted_at field,
 * preserving audit trail and compliance eligibility.
 *
 * This operation is available to authenticated sellers or admins configuring
 * their product options. It records logical deletion (not physical removal),
 * allowing for business rollback and evidentiary compliance. Attempts to delete
 * a non-existent or already soft-deleted option group will result in a clear
 * error.
 *
 * @param props - The request properties.
 * @param props.seller - The authenticated seller performing this action.
 * @param props.productId - The parent product's unique identifier (UUID).
 * @param props.optionId - The unique identifier of the option group to delete.
 * @returns Void
 * @throws {Error} If the option group does not exist, does not belong to the
 *   given product, or has already been soft deleted.
 */
export async function delete__shoppingMallAiBackend_seller_products_$productId_options_$optionId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, productId, optionId } = props;

  // Look up the product option group (not already deleted, and for this product)
  const option =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_options.findFirst({
      where: {
        id: optionId,
        shopping_mall_ai_backend_products_id: productId,
        deleted_at: null,
      },
    });
  if (!option)
    throw new Error("Product option group not found or already deleted");

  // Soft-delete: set deleted_at timestamp (current ISO8601 string)
  await MyGlobal.prisma.shopping_mall_ai_backend_product_options.update({
    where: { id: optionId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
