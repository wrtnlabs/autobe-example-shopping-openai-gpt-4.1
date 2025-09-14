import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartTemplate";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get detailed cart template by cartTemplateId from ai_commerce_cart_templates.
 *
 * Returns all properties of the ai_commerce_cart_templates row for the given
 * cartTemplateId. Only available to administrative users (AdminPayload
 * required). Used to review or edit a cart template before deployment.
 *
 * Authorization: Only authenticated admins may call this; the admin parameter
 * is required and checked by controller/decorator. Throws if not found.
 *
 * @param props - Properties for the request
 * @param props.admin - Authenticated admin making this request
 * @param props.cartTemplateId - Unique UUID for cart template to retrieve
 * @returns Full IAiCommerceCartTemplate object with all persisted schema
 *   properties
 * @throws {Error} If the cart template does not exist
 */
export async function getaiCommerceAdminCartTemplatesCartTemplateId(props: {
  admin: AdminPayload;
  cartTemplateId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceCartTemplate> {
  const { cartTemplateId } = props;
  // Query for the cart template by id only, with only schema fields
  const row = await MyGlobal.prisma.ai_commerce_cart_templates.findFirst({
    where: { id: cartTemplateId },
    select: {
      id: true,
      creator_id: true,
      store_id: true,
      template_name: true,
      description: true,
      active: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Not found
  if (!row) throw new Error("Cart template not found");

  return {
    id: row.id,
    creator_id: row.creator_id,
    store_id: row.store_id ?? undefined,
    template_name: row.template_name,
    description: row.description ?? undefined,
    active: row.active,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  };
}
