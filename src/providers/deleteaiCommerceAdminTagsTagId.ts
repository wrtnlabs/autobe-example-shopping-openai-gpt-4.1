import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently delete a tag record by tagId from ai_commerce_tags (hard delete).
 *
 * This operation performs an immediate, permanent delete of the specified tag
 * record and all its dependencies, as soft delete is not supported by the
 * schema. Only admin-level users may execute this. Before deletion, the tag is
 * verified to exist; if not found, an error is thrown. Deletion triggers
 * cascading deletes for all product/mapping dependencies. Every delete is
 * audited in ai_commerce_audit_logs_discovery for full compliance and
 * evidence.
 *
 * @param props - Object containing admin authentication and tagId
 * @param props.admin - The authenticated admin performing the deletion
 * @param props.tagId - Tag unique identifier (UUID)
 * @returns Void
 * @throws {Error} When the tag does not exist (404)
 */
export async function deleteaiCommerceAdminTagsTagId(props: {
  admin: AdminPayload;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, tagId } = props;
  const tag = await MyGlobal.prisma.ai_commerce_tags.findUnique({
    where: { id: tagId },
  });
  if (!tag) {
    throw new Error("Tag not found");
  }
  await MyGlobal.prisma.ai_commerce_tags.delete({
    where: { id: tagId },
  });
  await MyGlobal.prisma.ai_commerce_audit_logs_discovery.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_id: admin.id,
      event_type: "tag_delete",
      event_details: JSON.stringify({ ...tag }),
      created_at: toISOStringSafe(new Date()),
    },
  });
}
