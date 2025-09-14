import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceBulletin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBulletin";

/**
 * Get the details of a specific bulletin by its ID (ai_commerce_bulletins).
 *
 * Retrieves the detailed contents of a specific bulletin (announcement or
 * notice) from the ai_commerce_bulletins table using its unique identifier. The
 * response includes all public fields such as title, body, status, visibility,
 * and timestamps, suitable for display in user or admin dashboards.
 *
 * @param props Object containing the bulletinId (UUID) to retrieve.
 * @param props.bulletinId The unique identifier of the bulletin to retrieve.
 * @returns The full bulletin record, mapped according to the
 *   IAiCommerceBulletin DTO.
 * @throws {Error} If no bulletin with the given ID exists.
 */
export async function getaiCommerceBulletinsBulletinId(props: {
  bulletinId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceBulletin> {
  const { bulletinId } = props;
  const bulletin =
    await MyGlobal.prisma.ai_commerce_bulletins.findUniqueOrThrow({
      where: { id: bulletinId },
      select: {
        id: true,
        author_id: true,
        title: true,
        body: true,
        visibility: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    id: bulletin.id,
    author_id: bulletin.author_id,
    title: bulletin.title,
    body: bulletin.body,
    visibility: bulletin.visibility,
    status: bulletin.status,
    created_at: toISOStringSafe(bulletin.created_at),
    updated_at: toISOStringSafe(bulletin.updated_at),
    // deleted_at is optional/null/undefined: include as null if null in DB, omit if undefined
    ...(bulletin.deleted_at === null
      ? { deleted_at: null }
      : bulletin.deleted_at !== undefined
        ? { deleted_at: toISOStringSafe(bulletin.deleted_at) }
        : {}),
  };
}
