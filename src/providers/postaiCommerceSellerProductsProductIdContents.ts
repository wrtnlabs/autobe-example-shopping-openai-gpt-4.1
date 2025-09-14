import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductContent";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Create a new structured content record for a given product in
 * ai_commerce_product_contents
 *
 * Allows a seller to add a new content block (description, detail, spec,
 * instruction, etc.) to a product they own. Enforces unique (content_type,
 * locale) per product, and validates product ownership and status.
 *
 * @param props - Properties for content creation
 * @param props.seller - The authenticated seller performing the operation
 * @param props.productId - The product ID to attach the content to
 * @param props.body - DTO for new content details
 * @returns The newly created structured content as an IAiCommerceProductContent
 *   DTO
 * @throws {Error} If the product does not exist, is not modifiable, or is not
 *   owned by this seller
 * @throws {Error} If duplicate content_type/locale entry exists for this
 *   product
 */
export async function postaiCommerceSellerProductsProductIdContents(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductContent.ICreate;
}): Promise<IAiCommerceProductContent> {
  const { seller, productId, body } = props;
  // Step 1: Verify product exists and is modifiable by this seller
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: productId,
      seller_id: seller.id,
      deleted_at: null,
      status: { notIn: ["deleted", "discontinued"] },
    },
  });
  if (!product) {
    throw new Error("Product not found or cannot be modified by this seller");
  }

  // Step 2: Enforce unique (content_type, locale) per product (ignoring soft deleted contents)
  const duplicate =
    await MyGlobal.prisma.ai_commerce_product_contents.findFirst({
      where: {
        product_id: productId,
        content_type: body.content_type,
        locale: body.locale ?? null,
        // deleted_at: null, // <-- Removed, as field does not exist
      },
    });
  if (duplicate) {
    throw new Error("Duplicate content_type/locale for this product");
  }

  // Step 3: Create the content record
  const created = await MyGlobal.prisma.ai_commerce_product_contents.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      product_id: productId,
      content_type: body.content_type,
      format: body.format,
      locale: body.locale ?? null,
      content_body: body.content_body,
      display_order: body.display_order,
    },
  });

  // Step 4: Return result as IAiCommerceProductContent
  return {
    id: created.id,
    product_id: created.product_id,
    content_type: created.content_type,
    format: created.format,
    locale: created.locale ?? null,
    content_body: created.content_body,
    display_order: created.display_order,
  };
}
