import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceTag";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get details for a specific tag by tagId from ai_commerce_tags.
 *
 * Retrieves the detailed record of a single tag from the ai_commerce_tags table
 * by tagId. This endpoint is used for tag display, moderation decisions, or
 * tag-based analytics drilldown. Returns the full tag information including
 * name, status, description, timestamps. Only accessible by admins.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated administrator performing the request
 * @param props.tagId - Unique identifier for the tag to retrieve
 * @returns The full tag details (IAiCommerceTag)
 * @throws {Error} If the tag does not exist or the tagId is invalid
 */
export async function getaiCommerceAdminTagsTagId(props: {
  admin: AdminPayload;
  tagId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceTag> {
  const row = await MyGlobal.prisma.ai_commerce_tags.findFirst({
    where: { id: props.tagId },
  });
  if (!row) throw new Error("Tag not found");
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    description: row.description === null ? undefined : row.description,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  };
}
