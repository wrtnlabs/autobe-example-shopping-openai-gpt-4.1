import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductVariant";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get full information of a specific product variant under a given product for
 * admin/owner.
 *
 * This endpoint returns the detailed information of a product variant (option)
 * that belongs to a specified product, restricted to admin or product owner. It
 * ensures the product exists and is active, then retrieves the variant by id
 * and confirms it belongs to the product. Authorization is enforced by the
 * admin parameter.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin performing the request
 * @param props.productId - UUID of the parent product
 * @param props.variantId - UUID of the variant/option to fetch
 * @returns Details of the specific variant/option, including business fields
 *   and inventory (IAiCommerceProductVariant)
 * @throws {Error} If the product does not exist or is not active
 * @throws {Error} If the variant does not exist, is deleted, or does not belong
 *   to the product
 */
export async function getaiCommerceAdminProductsProductIdVariantsVariantId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceProductVariant> {
  const { admin, productId, variantId } = props;

  // Step 1: Ensure parent product exists (active, not soft-deleted)
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: { id: productId, deleted_at: null },
    select: { id: true },
  });
  if (!product) {
    throw new Error("Product not found");
  }

  // Step 2: Fetch variant by id, scoped to the product, and active (not soft deleted)
  const variant = await MyGlobal.prisma.ai_commerce_product_variants.findFirst({
    where: { id: variantId, product_id: productId, deleted_at: null },
  });
  if (!variant) {
    throw new Error("Variant not found");
  }

  // Step 3: Map DB object to DTO, converting Date objects to ISO string properly
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
    deleted_at:
      variant.deleted_at !== null && variant.deleted_at !== undefined
        ? toISOStringSafe(variant.deleted_at)
        : undefined,
  };
}
