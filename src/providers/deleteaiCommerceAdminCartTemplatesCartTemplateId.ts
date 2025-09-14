import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently delete a specific cart template from ai_commerce_cart_templates.
 *
 * This operation enables administrators to permanently and irrevocably delete a
 * cart template identified by cartTemplateId. The erase is permitted only if
 * the authenticated admin is the creator of the template (per current logic;
 * business policy may be extended for broader admin rights). Prior to deletion,
 * an audit log is persisted capturing the state of the template, the actor
 * admin's ID, and context for compliance purposes. If the template does not
 * exist or the caller lacks permission, an error is thrown. There is no
 * soft-delete: the row is removed entirely.
 *
 * @param props - The parameter object.
 * @param props.admin - Authenticated admin performing the delete.
 * @param props.cartTemplateId - UUID of the cart template to be deleted.
 * @returns Void
 * @throws {Error} If the cart template is not found, or the admin is not
 *   authorized to delete it.
 */
export async function deleteaiCommerceAdminCartTemplatesCartTemplateId(props: {
  admin: AdminPayload;
  cartTemplateId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, cartTemplateId } = props;
  // 1. Find the template by id
  const template = await MyGlobal.prisma.ai_commerce_cart_templates.findUnique({
    where: { id: cartTemplateId },
  });
  if (!template) {
    throw new Error("Cart template not found");
  }
  // 2. Authorization: only admin who created template can delete
  if (template.creator_id !== admin.id) {
    throw new Error("Not authorized to delete this cart template");
  }
  // 3. Write audit log for hard delete action BEFORE erasure
  await MyGlobal.prisma.ai_commerce_cart_audit_logs.create({
    data: {
      id: v4(),
      cart_id: null,
      actor_id: admin.id,
      entity_type: "cart_template",
      action_type: "delete",
      before_state_json: JSON.stringify(template),
      after_state_json: null,
      created_at: toISOStringSafe(new Date()),
    },
  });
  // 4. Permanently remove the template
  await MyGlobal.prisma.ai_commerce_cart_templates.delete({
    where: { id: cartTemplateId },
  });
}
