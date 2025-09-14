import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductContent";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a specific content record for a product from
 * ai_commerce_product_contents
 *
 * Fetches a single structured business content entry for a product, such as a
 * marketing description, technical detail, or instruction, as defined in the
 * ai_commerce_product_contents table. Only administrators can access this
 * endpoint for editing or audit purposes, with business logic enforcing access
 * control at the route decorator. Returns the complete entity including id,
 * product_id, content_type, format, locale, content_body, and display_order.
 *
 * @param props - Parameters for the API operation
 * @param props.admin - The authenticated admin making the request
 * @param props.productId - UUID of the product whose content is being fetched
 * @param props.contentId - UUID of the specific content record within the
 *   product
 * @returns The requested IAiCommerceProductContent entity with all fields
 *   populated
 * @throws {Error} When the content entry does not exist for the given product
 *   and content IDs
 */
export async function getaiCommerceAdminProductsProductIdContentsContentId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  contentId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceProductContent> {
  const { productId, contentId } = props;
  const content = await MyGlobal.prisma.ai_commerce_product_contents.findFirst({
    where: {
      id: contentId,
      product_id: productId,
    },
  });
  if (!content) {
    throw new Error("Product content not found");
  }
  return {
    id: content.id,
    product_id: content.product_id,
    content_type: content.content_type,
    format: content.format,
    // Provide locale as string | null | undefined per DTO (possible null from DB)
    locale: content.locale ?? null,
    content_body: content.content_body,
    display_order: content.display_order,
  };
}
