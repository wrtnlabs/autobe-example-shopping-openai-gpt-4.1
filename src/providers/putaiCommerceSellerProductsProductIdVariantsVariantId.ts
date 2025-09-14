import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductVariant";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update an existing product variant (ai_commerce_product_variants table).
 *
 * This function allows an authenticated seller to update details for a product
 * variant (SKU/options) belonging to their own product. It validates ownership,
 * ensures the variant is active and not soft-deleted, checks uniqueness of
 * sku_code (if changed), and validates non-negativity for price/inventory
 * fields. All updates refresh the updated_at timestamp and return the full
 * updated IAiCommerceProductVariant dto.
 *
 * @param props - Object containing the authenticated seller payload, productId
 *   (UUID), variantId (UUID), and update body (partial fields to patch)
 * @param props.seller - The authenticated seller making the update
 * @param props.productId - UUID of the parent product
 * @param props.variantId - UUID of the variant to update
 * @param props.body - Partial variant update fields
 * @returns The updated variant as IAiCommerceProductVariant
 * @throws {Error} When the seller does not own the product
 * @throws {Error} When the product or variant is not found or deleted
 * @throws {Error} When the sku_code is not unique among product variants
 * @throws {Error} When price or inventory is negative
 */
export async function putaiCommerceSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IAiCommerceProductVariant.IUpdate;
}): Promise<IAiCommerceProductVariant> {
  const { seller, productId, variantId, body } = props;

  // 1. Validate product existence and ownership
  const product = await MyGlobal.prisma.ai_commerce_products.findUnique({
    where: { id: productId },
    select: { id: true, seller_id: true },
  });
  if (!product || product.seller_id !== seller.id) {
    throw new Error("Forbidden: You do not own this product.");
  }

  // 2. Validate variant existence, correct parent, not soft-deleted
  const variant = await MyGlobal.prisma.ai_commerce_product_variants.findUnique(
    {
      where: { id: variantId },
    },
  );
  if (
    !variant ||
    variant.product_id !== productId ||
    variant.deleted_at !== null
  ) {
    throw new Error("Variant does not exist or has been deleted.");
  }

  // 3. Validate SKU code uniqueness within the product if changing
  if (body.sku_code !== undefined && body.sku_code !== variant.sku_code) {
    const skuConflict =
      await MyGlobal.prisma.ai_commerce_product_variants.findFirst({
        where: {
          product_id: productId,
          sku_code: body.sku_code,
        },
      });
    if (skuConflict) {
      throw new Error("SKU code must be unique within this product.");
    }
  }

  // 4. Validate non-negative fields
  if (body.variant_price !== undefined && body.variant_price < 0) {
    throw new Error("Variant price cannot be negative.");
  }
  if (body.inventory_quantity !== undefined && body.inventory_quantity < 0) {
    throw new Error("Inventory quantity cannot be negative.");
  }

  // 5. Perform update, using provided fields only
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updateData = {
    ...(body.sku_code !== undefined ? { sku_code: body.sku_code } : {}),
    ...(body.option_summary !== undefined
      ? { option_summary: body.option_summary }
      : {}),
    ...(body.variant_price !== undefined
      ? { variant_price: body.variant_price }
      : {}),
    ...(body.inventory_quantity !== undefined
      ? { inventory_quantity: body.inventory_quantity }
      : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
    updated_at: now,
  } satisfies Partial<
    Pick<
      IAiCommerceProductVariant,
      | "sku_code"
      | "option_summary"
      | "variant_price"
      | "inventory_quantity"
      | "status"
    >
  > & { updated_at: string & tags.Format<"date-time"> };

  const updated = await MyGlobal.prisma.ai_commerce_product_variants.update({
    where: { id: variantId },
    data: updateData,
  });

  return {
    id: updated.id,
    product_id: updated.product_id,
    sku_code: updated.sku_code,
    option_summary: updated.option_summary,
    variant_price: updated.variant_price,
    inventory_quantity: updated.inventory_quantity,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  } satisfies IAiCommerceProductVariant;
}
