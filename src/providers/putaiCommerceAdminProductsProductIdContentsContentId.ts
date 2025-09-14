import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductContent";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a specific product content record in ai_commerce_product_contents
 *
 * Permits an admin to fully or partially update a structured product content
 * record (e.g., description, instructions). Ensures the record belongs to the
 * specified product and updates only permitted fields. Throws an error if not
 * found.
 *
 * @param props - Request arguments
 * @param props.admin - AdminPayload with global privileges (authorization is
 *   required)
 * @param props.productId - UUID of the parent product
 * @param props.contentId - UUID of the specific content record
 * @param props.body - Partial record of updatable fields (content_type, format,
 *   locale, content_body, display_order)
 * @returns The updated product content record
 * @throws {Error} When the target record is not found
 */
export async function putaiCommerceAdminProductsProductIdContentsContentId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  contentId: string & tags.Format<"uuid">;
  body: IAiCommerceProductContent.IUpdate;
}): Promise<IAiCommerceProductContent> {
  const { admin, productId, contentId, body } = props;

  // 1. Ensure the product content exists for the given product
  const found = await MyGlobal.prisma.ai_commerce_product_contents.findFirst({
    where: {
      id: contentId,
      product_id: productId,
      // deleted_at removed since it does not exist
    },
  });
  if (!found) {
    throw new Error("Product content not found");
  }

  // 2. Update only the permitted fields
  const updated = await MyGlobal.prisma.ai_commerce_product_contents.update({
    where: { id: contentId },
    data: {
      content_type: body.content_type ?? undefined,
      format: body.format ?? undefined,
      locale: body.locale ?? undefined,
      content_body: body.content_body ?? undefined,
      display_order: body.display_order ?? undefined,
      // updated_at removed - not a permitted field in update
    },
  });

  // 3. Return the full entity in API format (nullable/optional fields handled per DTO)
  return {
    id: updated.id,
    product_id: updated.product_id,
    content_type: updated.content_type,
    format: updated.format,
    locale: updated.locale ?? undefined,
    content_body: updated.content_body,
    display_order: updated.display_order,
  };
}
