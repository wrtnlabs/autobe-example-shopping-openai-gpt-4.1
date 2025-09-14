import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceBulletin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBulletin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new platform bulletin or announcement. Only admins can use this
 * endpoint.
 *
 * Inserts a new record into ai_commerce_bulletins with all required business
 * fields. Accepts props.admin for authorization and props.body for bulletin
 * contents. Generates id and timestamps immutably, never using the Date type or
 * 'as' assertions.
 *
 * @param props - Properties including:
 *
 *   - Admin: AdminPayload (authorization, enforced by decorator)
 *   - Body: IAiCommerceBulletin.ICreate (bulletin input fields)
 *
 * @returns IAiCommerceBulletin - The complete bulletin entity as persisted,
 *   conforming to all branding/type rules.
 * @throws {Error} If the creation fails for any reason (unhandled runtime
 *   errors)
 */
export async function postaiCommerceAdminBulletins(props: {
  admin: AdminPayload;
  body: IAiCommerceBulletin.ICreate;
}): Promise<IAiCommerceBulletin> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.ai_commerce_bulletins.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      author_id: props.body.author_id,
      title: props.body.title,
      body: props.body.body,
      visibility: props.body.visibility,
      status: props.body.status,
      created_at: now,
      updated_at: now,
      deleted_at: undefined,
    },
  });
  return {
    id: created.id,
    author_id: created.author_id,
    title: created.title,
    body: created.body,
    visibility: created.visibility,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null || typeof created.deleted_at === "undefined"
        ? null
        : toISOStringSafe(created.deleted_at),
  };
}
