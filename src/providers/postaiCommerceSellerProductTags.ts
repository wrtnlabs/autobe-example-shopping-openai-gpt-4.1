import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductTag";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Create a new product-tag binding (ai_commerce_product_tags).
 *
 * This endpoint allows a seller to associate an existing tag with one of their
 * own products, improving the product's visibility and discoverability for
 * search, categorization, and marketing analytics. Sellers can only tag
 * products that they own. Attempts to tag products belonging to another seller
 * or to create a duplicate tag binding will result in an error. The binding is
 * unique for each product and tag pair.
 *
 * @param props - Operation parameters
 * @param props.seller - Authenticated seller user payload (must be the
 *   product's owner)
 * @param props.body - The product-tag association payload containing both IDs
 * @returns The created product-tag binding entity
 * @throws {Error} If the product is not found or not owned by the seller
 * @throws {Error} If the tag is not found
 * @throws {Error} If a duplicate product-tag binding exists
 */
export async function postaiCommerceSellerProductTags(props: {
  seller: SellerPayload;
  body: IAiCommerceProductTag.ICreate;
}): Promise<IAiCommerceProductTag> {
  const { seller, body } = props;

  // 1. Validate that the product exists and belongs to the authenticated seller.
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: body.ai_commerce_product_id,
      seller_id: seller.id,
    },
  });
  if (!product) {
    throw new Error("Product not found or not owned by seller.");
  }

  // 2. Validate that the tag exists.
  const tag = await MyGlobal.prisma.ai_commerce_tags.findFirst({
    where: { id: body.ai_commerce_tag_id },
  });
  if (!tag) {
    throw new Error("Tag not found.");
  }

  // 3. Check for duplicate binding.
  const existing = await MyGlobal.prisma.ai_commerce_product_tags.findFirst({
    where: {
      ai_commerce_product_id: body.ai_commerce_product_id,
      ai_commerce_tag_id: body.ai_commerce_tag_id,
    },
  });
  if (existing) {
    throw new Error("This tag is already associated with the product.");
  }

  // 4. Create the product-tag binding.
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.ai_commerce_product_tags.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      ai_commerce_product_id: body.ai_commerce_product_id,
      ai_commerce_tag_id: body.ai_commerce_tag_id,
      created_at: now,
    },
  });

  // 5. Return the result as IAiCommerceProductTag.
  return {
    id: created.id,
    ai_commerce_product_id: created.ai_commerce_product_id,
    ai_commerce_tag_id: created.ai_commerce_tag_id,
    created_at: created.created_at,
  };
}
