import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductVariant";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Create a new product variant (SKU/option) under an owned product.
 *
 * Allows a seller to register a new variant for an existing product they own.
 * The new variant must have a unique sku_code for the product, and all business
 * constraints are enforced.
 *
 * @param props - Parameters for creating a product variant
 * @param props.seller - The authenticated seller performing the operation (must
 *   own the product)
 * @param props.productId - UUID of the parent product to attach the variant to
 * @param props.body - Variant details (SKU, option summary, price, quantity,
 *   status)
 * @returns The newly created variant record (IAiCommerceProductVariant), with
 *   all timestamps and IDs populated.
 * @throws {Error} If product not found, unauthorized, or not owned by seller
 * @throws {Error} If a variant with the same sku_code already exists under this
 *   product
 */
export async function postaiCommerceSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductVariant.ICreate;
}): Promise<IAiCommerceProductVariant> {
  const { seller, productId, body } = props;

  // 1. Check product exists, is not deleted, and is owned by seller
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: productId,
      seller_id: seller.id,
      deleted_at: null,
    },
  });
  if (!product)
    throw new Error(
      "Product does not exist, is deleted, or you do not have permission to add variants.",
    );

  // 2. Check uniqueness of sku_code under this product (must not already exist and be active)
  const existingVariant =
    await MyGlobal.prisma.ai_commerce_product_variants.findFirst({
      where: {
        product_id: productId,
        sku_code: body.sku_code,
        deleted_at: null,
      },
    });
  if (existingVariant)
    throw new Error(
      "A variant with the same sku_code already exists for this product.",
    );

  // 3. Prepare required fields for new variant (generate ID, timestamps)
  const now = toISOStringSafe(new Date());
  const variant = await MyGlobal.prisma.ai_commerce_product_variants.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      product_id: productId,
      sku_code: body.sku_code,
      option_summary: body.option_summary,
      variant_price: body.variant_price,
      inventory_quantity: body.inventory_quantity,
      status: body.status,
      created_at: now,
      updated_at: now,
    },
  });

  // 4. Map DB result to API return type, converting any date fields appropriately
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
