import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartTemplate";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Get detailed cart template by cartTemplateId from ai_commerce_cart_templates.
 *
 * Returns all properties of the ai_commerce_cart_templates row for the provided
 * cartTemplateId. Only the seller who owns the template may access this
 * endpoint. Throws an error if the row is not found or the seller does not have
 * access. Used for review, configuration, and edit flows before deployment.
 *
 * @param props - The request object with seller authentication and the target
 *   cartTemplateId.
 * @param props.seller - The authenticated seller payload (must be the owner of
 *   the template).
 * @param props.cartTemplateId - The UUID of the cart template to retrieve.
 * @returns The full cart template detailed object (IAiCommerceCartTemplate) as
 *   persisted in the database.
 * @throws {Error} If the cart template does not exist or the seller does not
 *   own the template.
 */
export async function getaiCommerceSellerCartTemplatesCartTemplateId(props: {
  seller: SellerPayload;
  cartTemplateId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceCartTemplate> {
  const { seller, cartTemplateId } = props;
  // Fetch by id. Only select schema-available fields (deleted_at is NOT in schema).
  const template = await MyGlobal.prisma.ai_commerce_cart_templates.findFirst({
    where: {
      id: cartTemplateId,
    },
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
  if (!template) throw new Error("Cart template not found");
  // Only owner can view
  if (template.creator_id !== seller.id)
    throw new Error("Unauthorized to access this cart template");

  return {
    id: template.id,
    creator_id: template.creator_id,
    store_id: template.store_id ?? undefined,
    template_name: template.template_name,
    description: template.description ?? undefined,
    active: template.active,
    created_at: toISOStringSafe(template.created_at),
    updated_at: toISOStringSafe(template.updated_at),
    // deleted_at not present; do not include
  };
}
