import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartTemplate";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update properties of an existing cart template by cartTemplateId.
 *
 * This endpoint enables admins (who are also the owning creator) to update
 * template fields (name, description, store assignment, and active status) for
 * their own cart templates. The update is only allowed if the admin is the
 * original creator. Uniqueness of template_name per creator is enforced, and
 * the endpoint returns the full updated template for confirmation.
 *
 * @param props - Object containing admin, cartTemplateId, and update fields
 * @param props.admin - The authenticated admin performing the update
 * @param props.cartTemplateId - The target cart template's UUID
 * @param props.body - Update fields (template_name, description, store_id,
 *   active)
 * @returns The updated IAiCommerceCartTemplate record
 * @throws {Error} If the template doesn't exist, ownership mismatch, or
 *   duplicate template_name for the same creator
 */
export async function putaiCommerceAdminCartTemplatesCartTemplateId(props: {
  admin: AdminPayload;
  cartTemplateId: string & tags.Format<"uuid">;
  body: IAiCommerceCartTemplate.IUpdate;
}): Promise<IAiCommerceCartTemplate> {
  const { admin, cartTemplateId, body } = props;
  // 1. Find template and check ownership
  const existing = await MyGlobal.prisma.ai_commerce_cart_templates.findUnique({
    where: { id: cartTemplateId },
  });
  if (!existing || existing.creator_id !== admin.id) {
    throw new Error("Cart template not found or permission denied");
  }
  // 2. If updating template_name, enforce unique per creator (excluding self)
  if (
    typeof body.template_name === "string" &&
    body.template_name !== existing.template_name
  ) {
    const duplicate =
      await MyGlobal.prisma.ai_commerce_cart_templates.findFirst({
        where: {
          creator_id: admin.id,
          template_name: body.template_name,
          NOT: { id: cartTemplateId },
        },
      });
    if (duplicate) {
      throw new Error("Duplicate template_name for this creator");
    }
  }
  // 3. Prepare update fields; always set updated_at to now
  const now = toISOStringSafe(new Date());
  const updateFields = {
    ...(typeof body.template_name === "string"
      ? { template_name: body.template_name }
      : {}),
    ...(body.description !== undefined
      ? { description: body.description }
      : {}),
    ...(body.store_id !== undefined ? { store_id: body.store_id } : {}),
    ...(body.active !== undefined ? { active: body.active } : {}),
    updated_at: now,
  };
  // 4. Do the update
  const updated = await MyGlobal.prisma.ai_commerce_cart_templates.update({
    where: { id: cartTemplateId },
    data: updateFields,
  });
  // 5. Return DTO-compliant object (no deleted_at field)
  return {
    id: updated.id,
    creator_id: updated.creator_id,
    store_id: updated.store_id ?? undefined,
    template_name: updated.template_name,
    description: updated.description ?? undefined,
    active: updated.active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
