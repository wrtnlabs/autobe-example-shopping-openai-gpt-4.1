import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductCategoryBindings } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductCategoryBindings";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Get details of a specific product-category binding by its identifier for a
 * product.
 *
 * This endpoint allows authenticated sellers to fetch the detail of a
 * product-category binding that belongs to their own product. The operation
 * strictly enforces that a seller can only view bindings for products they own.
 * If the requested binding does not exist, or does not match the product, or
 * the product is not owned by the authenticated seller, an error is thrown. All
 * responses are formatted according to the API contract, with date fields
 * converted to ISO 8601 string format.
 *
 * @param props Object containing parameters for the operation
 * @param props.seller Authenticated seller performing the request
 * @param props.productId Unique identifier of the product to which this binding
 *   belongs
 * @param props.bindingId Unique identifier of the product-category binding to
 *   fetch
 * @returns The detail of the specified product-category binding entity
 * @throws {Error} If the binding is not found, the product is not found, or the
 *   seller does not own the product
 */
export async function getaiCommerceSellerProductsProductIdCategoryBindingsBindingId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  bindingId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceProductCategoryBindings> {
  const { seller, productId, bindingId } = props;

  // 1. Find the binding by id and product_id
  const binding =
    await MyGlobal.prisma.ai_commerce_product_category_bindings.findFirst({
      where: {
        id: bindingId,
        product_id: productId,
      },
    });
  if (!binding) {
    throw new Error("Product-category binding not found");
  }

  // 2. Find the product to verify ownership
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: binding.product_id,
    },
  });
  if (!product) {
    throw new Error("Product not found");
  }
  if (product.seller_id !== seller.id) {
    throw new Error(
      "Forbidden: Cannot access bindings of products you do not own",
    );
  }

  // 3. Return the IAiCommerceProductCategoryBindings DTO
  return {
    id: binding.id,
    product_id: binding.product_id,
    category_id: binding.category_id,
    created_at: toISOStringSafe(binding.created_at),
  };
}
