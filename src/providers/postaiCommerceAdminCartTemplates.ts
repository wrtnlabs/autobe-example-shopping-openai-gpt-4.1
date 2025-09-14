import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartTemplate";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new cart template in ai_commerce_cart_templates.
 *
 * Registers a new cart template for a system administrator in
 * ai_commerce_cart_templates. Enforces uniqueness for template_name per
 * creator, full field/audit coverage, and role-based authorization (admin role
 * required). Returns the created template with all assigned fields, timestamps,
 * and optional values strictly typed.
 *
 * @param props - Parameters for template creation
 * @param props.admin - Authenticated admin user creating the cart template
 *   (AdminPayload)
 * @param props.body - Cart template creation body
 *   (IAiCommerceCartTemplate.ICreate: template_name, active, description,
 *   store_id)
 * @returns Complete persisted IAiCommerceCartTemplate object as created
 * @throws {Error} If template_name is not unique for this creator (duplicate
 *   violation)
 */
export async function postaiCommerceAdminCartTemplates(props: {
  admin: AdminPayload;
  body: IAiCommerceCartTemplate.ICreate;
}): Promise<IAiCommerceCartTemplate> {
  const now = toISOStringSafe(new Date());
  try {
    const created = await MyGlobal.prisma.ai_commerce_cart_templates.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        creator_id: props.admin.id,
        store_id: props.body.store_id ?? null,
        template_name: props.body.template_name,
        description: props.body.description ?? null,
        active: props.body.active,
        created_at: now,
        updated_at: now,
      },
    });
    return {
      id: created.id,
      creator_id: created.creator_id,
      store_id: created.store_id ?? undefined,
      template_name: created.template_name,
      description: created.description ?? undefined,
      active: created.active,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      // deleted_at omitted: not in select result unless included, and for new records always undefined
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error(
        "Duplicate template_name for this creator is not allowed",
      );
    }
    throw err;
  }
}
