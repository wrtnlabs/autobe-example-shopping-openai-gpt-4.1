import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartTemplate";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Create a new cart template in ai_commerce_cart_templates.
 *
 * Registers a new cart template for a seller or administrator in
 * ai_commerce_cart_templates. All fields are validated for requiredness,
 * uniqueness, and role constraints. Buyers may not use this endpoint. Success
 * returns the full new template as created.
 *
 * @param props - Properties for the new cart template.
 * @returns The newly created cart template.
 * @throws {Error} If a template with the same name exists for this seller, or
 *   upon database error.
 * @field seller - Authenticated seller making the request.
 * @field body - The creation input for the cart template (template_name, creator_id, optionally store_id/description/active).
 */
export async function postaiCommerceSellerCartTemplates(props: {
  seller: SellerPayload;
  body: IAiCommerceCartTemplate.ICreate;
}): Promise<IAiCommerceCartTemplate> {
  const { seller, body } = props;

  // Enforce uniqueness: cannot create a template with the same name/creator twice
  const duplicate = await MyGlobal.prisma.ai_commerce_cart_templates.findFirst({
    where: {
      creator_id: seller.id,
      template_name: body.template_name,
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new Error(
      "Cart template with this name already exists for this seller.",
    );
  }

  // Timestamps for creation and update
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create the cart template
  const created = await MyGlobal.prisma.ai_commerce_cart_templates.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      creator_id: seller.id,
      store_id: body.store_id ?? null,
      template_name: body.template_name,
      description: body.description ?? null,
      active: body.active,
      created_at: now,
      updated_at: now,
    },
  });

  // Format response as per DTO requirements (all times: string & tags.Format<'date-time'>)
  return {
    id: created.id,
    creator_id: created.creator_id,
    store_id: created.store_id ?? undefined,
    template_name: created.template_name,
    description: created.description ?? undefined,
    active: created.active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    // no deleted_at field per schema
  };
}
