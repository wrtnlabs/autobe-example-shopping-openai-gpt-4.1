import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductVariant";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Get full information of a specific product variant under a given product for
 * admin/owner.
 *
 * Retrieves the complete details of a specific product variant (SKU/option)
 * scoped under a parent productId, enforcing seller ownership access. Only the
 * owning seller may access their variants; other sellers are denied. Variant
 * must exist and not be soft-deleted. Returns business fields and metadata for
 * the variant in IAiCommerceProductVariant format. Throws error if
 * variant/product is missing, soft-deleted, or if the current seller is not
 * owner of the parent product.
 *
 * @param props - Object containing seller JWT context, parent productId, and
 *   target variantId.
 * @param props.seller - The authenticated seller role payload (must own the
 *   product/variant).
 * @param props.productId - UUID of the product (parentId) for ownership scope.
 * @param props.variantId - UUID of the target product variant (SKU/option).
 * @returns The complete variant detail in IAiCommerceProductVariant structure
 *   (all fields, business and dates).
 * @throws {Error} When variant or product not found, or access forbidden due to
 *   ownership mismatch.
 */
export async function getaiCommerceSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceProductVariant> {
  // 1. Fetch variant matching both id and product_id, and not soft-deleted
  const variant = await MyGlobal.prisma.ai_commerce_product_variants.findFirst({
    where: {
      id: props.variantId,
      product_id: props.productId,
      deleted_at: null,
    },
  });
  if (!variant) throw new Error("Variant not found");

  // 2. Fetch parent product (to check ownership), must not be deleted (soft deletion is not modeled on product)
  const product = await MyGlobal.prisma.ai_commerce_products.findUnique({
    where: {
      id: props.productId,
    },
  });
  if (!product) throw new Error("Parent product not found");

  // 3. Enforce seller ownership: Only the owning seller can access
  if (product.seller_id !== props.seller.id) {
    throw new Error("Forbidden: You do not own this product");
  }

  // 4. Map and transform variant fields to API DTO type
  return {
    id: variant.id,
    product_id: variant.product_id,
    sku_code: variant.sku_code,
    option_summary: variant.option_summary,
    variant_price: variant.variant_price,
    inventory_quantity: variant.inventory_quantity,
    status: variant.status,
    created_at: toISOStringSafe(variant.created_at),
    updated_at: toISOStringSafe(variant.updated_at),
    deleted_at: variant.deleted_at
      ? toISOStringSafe(variant.deleted_at)
      : undefined,
  };
}
