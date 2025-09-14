import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a category template by templateId
 * (ai_commerce_category_templates).
 *
 * Performs a logical removal (soft delete) of a category template by setting
 * its deleted_at field to the current date-time. This operation preserves audit
 * and evidence trails for compliance, and ensures the template remains evidence
 * in the system while being excluded from active business flows. Deletion is
 * admin-only. Attempting to delete a non-existent or already deleted template
 * will result in an error. External constraint checks (bindings to channels,
 * etc.) are the responsibility of upstream business logic.
 *
 * @param props - Operation props
 * @param props.admin - Authenticated admin performing the operation
 * @param props.templateId - UUID of the category template to delete
 * @returns Void (on success)
 * @throws {Error} If the template does not exist or is already deleted
 */
export async function deleteaiCommerceAdminCategoryTemplatesTemplateId(props: {
  admin: AdminPayload;
  templateId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, templateId } = props;

  // Step 1: Find the template to ensure it exists and is not already deleted.
  const existing =
    await MyGlobal.prisma.ai_commerce_category_templates.findFirst({
      where: {
        id: templateId,
        deleted_at: null,
      },
    });
  if (!existing) {
    throw new Error("Category template not found or already deleted");
  }

  // Step 2: Soft delete by setting deleted_at (ISO string)
  await MyGlobal.prisma.ai_commerce_category_templates.update({
    where: { id: templateId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
