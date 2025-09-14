import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductContent";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve a specific content record for a product from
 * ai_commerce_product_contents
 *
 * Fetches a single structured business content entry for a product—such as a
 * marketing description, technical detail, or instruction—from the
 * ai_commerce_product_contents table. The operation ensures that only the owner
 * seller can access their associated product contents, enforcing strict
 * ownership checks via relational joins.
 *
 * @param props - Seller: The authenticated seller making the request (payload
 *   includes their buyer id) productId: The parent product's UUID (must be
 *   owned by the seller) contentId: The unique UUID for the product content
 *   record
 * @returns The requested detailed product content entity matching
 *   IAiCommerceProductContent
 * @throws {Error} If the content record does not exist, is deleted, or does not
 *   belong to the requesting seller
 */
export async function getaiCommerceSellerProductsProductIdContentsContentId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  contentId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceProductContent> {
  const { seller, productId, contentId } = props;

  // Find the product content row
  const content = await MyGlobal.prisma.ai_commerce_product_contents.findFirst({
    where: {
      id: contentId,
      product_id: productId,
    },
  });
  if (!content) throw new Error("Not found or unauthorized");

  // Find and check the actual product's seller
  const product = await MyGlobal.prisma.ai_commerce_products.findUnique({
    where: { id: content.product_id },
    select: { seller_id: true },
  });
  if (!product || product.seller_id !== seller.id)
    throw new Error("Not found or unauthorized");

  return {
    id: content.id,
    product_id: content.product_id,
    content_type: content.content_type,
    format: content.format,
    locale: content.locale ?? undefined,
    content_body: content.content_body,
    display_order: content.display_order,
  };
}
