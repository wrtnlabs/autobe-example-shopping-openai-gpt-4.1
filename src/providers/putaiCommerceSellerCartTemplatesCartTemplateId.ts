import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartTemplate";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update properties of an existing cart template by cartTemplateId.
 *
 * Updates a cart template entity in ai_commerce_cart_templates. Only the owning
 * seller is permitted to update its template. Permitted fields are
 * template_name, description, store_id, and active. Field updates are
 * restricted by IAiCommerceCartTemplate.IUpdate. Ownership and existence are
 * enforced; an error is thrown if unauthorized or not found. All date fields
 * are normalized according to branding rules.
 *
 * @param props - The input parameters for the update operation
 * @param props.seller - Authenticated seller payload
 * @param props.cartTemplateId - UUID of the template to update
 * @param props.body - Partial update fields for the cart template
 *   (IAiCommerceCartTemplate.IUpdate)
 * @returns The fully updated IAiCommerceCartTemplate entity
 * @throws {Error} When the template is not found or the seller does not own it
 */
export async function putaiCommerceSellerCartTemplatesCartTemplateId(props: {
  seller: SellerPayload;
  cartTemplateId: string & tags.Format<"uuid">;
  body: IAiCommerceCartTemplate.IUpdate;
}): Promise<IAiCommerceCartTemplate> {
  const { seller, cartTemplateId, body } = props;

  // Fetch the cart template with matching id
  const template = await MyGlobal.prisma.ai_commerce_cart_templates.findFirst({
    where: {
      id: cartTemplateId,
    },
  });
  if (!template) throw new Error("Cart template not found");
  if (template.creator_id !== seller.id)
    throw new Error(
      "Unauthorized: Only the owner can update this cart template",
    );

  const now = toISOStringSafe(new Date());

  // Build update object (only include provided fields)
  const updateData: {
    template_name?: string;
    description?: string | null;
    store_id?: string | null;
    active?: boolean;
    updated_at: string & tags.Format<"date-time">;
  } = {
    ...(body.template_name !== undefined && {
      template_name: body.template_name,
    }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.store_id !== undefined && { store_id: body.store_id }),
    ...(body.active !== undefined && { active: body.active }),
    updated_at: now,
  };

  const updated = await MyGlobal.prisma.ai_commerce_cart_templates.update({
    where: { id: cartTemplateId },
    data: updateData,
  });
  return {
    id: updated.id,
    creator_id: updated.creator_id,
    store_id: updated.store_id ?? undefined,
    template_name: updated.template_name,
    description: updated.description ?? undefined,
    active: updated.active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    // No deleted_at field for this model
  };
}
