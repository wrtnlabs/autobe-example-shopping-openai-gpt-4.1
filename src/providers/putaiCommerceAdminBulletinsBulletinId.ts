import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceBulletin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBulletin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing bulletin (ai_commerce_bulletins) by its unique ID as an
 * administrator.
 *
 * This operation allows an admin to modify the title, content, visibility, and
 * status fields of a bulletin record. It restricts updating to only the
 * supported fields in IAiCommerceBulletin.IUpdate, sets updated_at to the
 * current time, and enforces that the bulletin exists and is not already
 * soft-deleted. Complies with business logic and type safety rules—never uses
 * Date type.
 *
 * @param props - Admin: The authenticated administrator performing the update
 *   (AdminPayload) bulletinId: UUID identifying the bulletin to update body:
 *   Fields to update on the bulletin (may include title, body, visibility,
 *   status), see IAiCommerceBulletin.IUpdate
 * @returns The fully updated bulletin record conforming to IAiCommerceBulletin,
 *   with proper date/time string fields and nullable soft delete field
 * @throws {Error} If the bulletin does not exist or is soft-deleted
 */
export async function putaiCommerceAdminBulletinsBulletinId(props: {
  admin: AdminPayload;
  bulletinId: string & tags.Format<"uuid">;
  body: IAiCommerceBulletin.IUpdate;
}): Promise<IAiCommerceBulletin> {
  const { admin, bulletinId, body } = props;
  // Fetch the target bulletin, enforcing non-deleted status
  const existing = await MyGlobal.prisma.ai_commerce_bulletins.findFirst({
    where: {
      id: bulletinId,
      deleted_at: null,
    },
  });
  if (!existing) {
    throw new Error("Bulletin not found or deleted");
  }
  // Compose update input strictly from the allowed fields
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.ai_commerce_bulletins.update({
    where: { id: bulletinId },
    data: {
      title: body.title ?? undefined,
      body: body.body ?? undefined,
      visibility: body.visibility ?? undefined,
      status: body.status ?? undefined,
      updated_at: now,
    },
  });
  // Build result, converting all date fields as required and handling deleted_at (optional+nullable)
  return {
    id: updated.id,
    author_id: updated.author_id,
    title: updated.title,
    body: updated.body,
    visibility: updated.visibility,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
