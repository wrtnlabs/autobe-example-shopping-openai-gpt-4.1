import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceTag";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new tag, inserting into ai_commerce_tags as an admin.
 *
 * This operation allows an authenticated admin to create a new tag for use in
 * product, discovery, or analytics modules. Enforces business and schema-level
 * uniqueness on tag name (case-sensitive), supports moderation metadata, and
 * returns the created tag with all fields.
 *
 * @param props - Operation props
 * @param props.admin - The authenticated admin user creating this tag
 * @param props.body - Tag creation fields: name (string, unique), status
 *   (string), optional description
 * @returns The created IAiCommerceTag object
 * @throws {Error} If a tag with the same name already exists, or if any
 *   required business rule is violated
 */
export async function postaiCommerceAdminTags(props: {
  admin: AdminPayload;
  body: IAiCommerceTag.ICreate;
}): Promise<IAiCommerceTag> {
  const { body } = props;

  const duplicate = await MyGlobal.prisma.ai_commerce_tags.findFirst({
    where: {
      name: body.name,
    },
  });
  if (duplicate !== null) {
    throw new Error("Tag with the same name already exists");
  }

  const id = v4();
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.ai_commerce_tags.create({
    data: {
      id,
      name: body.name,
      status: body.status,
      description: body.description ?? undefined,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    name: created.name,
    status: created.status,
    description: created.description ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
