import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a product content entity associated with a specific product in
 * ai_commerce_product_contents.
 *
 * This operation deletes the specified product content by physically removing
 * it from the database (hard delete) and logs an audit snapshot for compliance.
 * Only admins are authorized.
 *
 * @param props - Object containing parameters for deletion.
 * @param props.admin - The authenticated admin making the request
 * @param props.productId - The target product UUID whose content is to be
 *   deleted
 * @param props.contentId - The target content UUID to delete
 * @returns Void
 * @throws {Error} If the content does not exist, or any unexpected database
 *   error occurs.
 */
export async function deleteaiCommerceAdminProductsProductIdContentsContentId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  contentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, productId, contentId } = props;

  // Fetch the product content, making sure it exists
  const content = await MyGlobal.prisma.ai_commerce_product_contents.findFirst({
    where: {
      id: contentId,
      product_id: productId,
    },
  });
  if (!content) {
    throw new Error("Product content not found");
  }

  // Serialize the current content as before state for audit
  await MyGlobal.prisma.ai_commerce_product_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      product_id: content.product_id,
      event_type: "delete_content",
      actor_id: admin.id,
      before_json: JSON.stringify({
        id: content.id,
        product_id: content.product_id,
        content_type: content.content_type,
        format: content.format,
        locale: content.locale ?? undefined,
        content_body: content.content_body,
        display_order: content.display_order,
      }),
      after_json: null,
      created_at: toISOStringSafe(new Date()),
    },
  });

  // Hard delete: physically remove from database
  await MyGlobal.prisma.ai_commerce_product_contents.delete({
    where: { id: content.id },
  });
}
