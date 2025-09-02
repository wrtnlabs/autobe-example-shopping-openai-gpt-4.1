import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptions";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Get detailed information about a specific product option group.
 *
 * Retrieve the detailed information of a specific product option group for the
 * target product. Appropriate for use by sellers wishing to edit or audit their
 * product's options or by admins for compliance review. Only active (not
 * soft-deleted) options are accessible to sellers; all retrievals are logged
 * for compliance and evidence purposes.
 *
 * If the option is not found or is already soft-deleted, a not found or access
 * denied error is returned. Typically paired with update and delete operations
 * in the product management UI.
 *
 * @param props - Request properties
 * @param props.seller - The authenticated seller account making the request
 * @param props.productId - Unique identifier of the parent product
 * @param props.optionId - Unique identifier of the product option to retrieve
 * @returns The detailed information of the requested product option group
 * @throws {Error} When option group is not found or is already soft-deleted, or
 *   ownership cannot be determined via schema
 */
export async function get__shoppingMallAiBackend_seller_products_$productId_options_$optionId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendProductOptions> {
  const { productId, optionId } = props;

  // Find the product option by id and parent product id, only if not soft-deleted
  const optionGroup =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_options.findFirst({
      where: {
        id: optionId,
        shopping_mall_ai_backend_products_id: productId,
        deleted_at: null,
      },
    });

  if (!optionGroup) {
    throw new Error("Product option group not found or already soft-deleted");
  }

  return {
    id: optionGroup.id,
    shopping_mall_ai_backend_products_id:
      optionGroup.shopping_mall_ai_backend_products_id,
    option_name: optionGroup.option_name,
    required: optionGroup.required,
    sort_order: optionGroup.sort_order as number & tags.Type<"int32">,
    created_at: toISOStringSafe(optionGroup.created_at),
    updated_at: toISOStringSafe(optionGroup.updated_at),
    deleted_at: optionGroup.deleted_at
      ? toISOStringSafe(optionGroup.deleted_at)
      : null,
  };
}
