import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductContent";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update a specific product content record in ai_commerce_product_contents
 *
 * Enables a seller to update structured content of their own product, such as
 * description, details, how-to blocks, or localization, via the product content
 * ID. Only the owner seller may update product content. Supports partial or
 * full updates, and strictly validates existence, ownership, and current
 * state.
 *
 * @param props - The request properties
 * @param props.seller - The authenticated seller making the request (must own
 *   the product)
 * @param props.productId - The product's UUID (the parent of the content
 *   record)
 * @param props.contentId - Target content record's UUID to update
 * @param props.body - Fields to update (partial or complete) for the content
 *   record
 * @returns Updated IAiCommerceProductContent record with all current values
 * @throws {Error} If not found, or forbidden, or not owned by seller
 */
export async function putaiCommerceSellerProductsProductIdContentsContentId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  contentId: string & tags.Format<"uuid">;
  body: IAiCommerceProductContent.IUpdate;
}): Promise<IAiCommerceProductContent> {
  const { seller, productId, contentId, body } = props;

  // Step 1: Find content. Do NOT filter by deleted_at, since field doesn't exist in schema.
  const content = await MyGlobal.prisma.ai_commerce_product_contents.findFirst({
    where: {
      id: contentId,
      // deleted_at field does not exist, so we cannot filter by soft delete
    },
  });
  if (!content || content.product_id !== productId) {
    throw new Error("Not found");
  }

  // Step 2: Ownership check - fetch associated product
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: productId,
    },
  });
  if (!product || product.seller_id !== seller.id) {
    throw new Error("Forbidden");
  }

  // Step 3: Prepare update data structure, only include provided fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const data = {
    ...(body.content_type !== undefined && { content_type: body.content_type }),
    ...(body.format !== undefined && { format: body.format }),
    ...(body.locale !== undefined && { locale: body.locale }),
    ...(body.content_body !== undefined && { content_body: body.content_body }),
    ...(body.display_order !== undefined && {
      display_order: body.display_order,
    }),
    updated_at: now,
  };

  const updated = await MyGlobal.prisma.ai_commerce_product_contents.update({
    where: { id: contentId },
    data, // fully type-verified, no unknown fields
  });

  // Step 4: Return the properly structured DTO record
  return {
    id: updated.id,
    product_id: updated.product_id,
    content_type: updated.content_type,
    format: updated.format,
    locale: updated.locale === undefined ? undefined : updated.locale,
    content_body: updated.content_body,
    display_order: updated.display_order,
  };
}
