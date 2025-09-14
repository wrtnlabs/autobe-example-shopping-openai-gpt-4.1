import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceTag";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update all major properties of an existing tag by tagId (admin/moderator
 * only).
 *
 * This endpoint allows an administrator or moderator to fully overwrite the
 * name, status, and description of an ai_commerce_tags entity. The operation
 * enforces unique tag naming (excluding the current tag), restricts status to
 * an allowed enum set, and rejects attempts to update non-existent tags or
 * create naming conflicts. All date/datetime fields are handled as branded ISO
 * strings. No Date usage or type assertions are permitted: all fields are
 * returned in strict API conformance. Authorization is enforced via the admin
 * parameter.
 *
 * @param props - Object containing all parameters for the operation
 * @param props.admin - Authenticated administrator performing the update
 * @param props.tagId - The unique identifier of the tag to update
 * @param props.body - Form containing new name, status, and description values
 *   to set
 * @returns The updated tag object reflecting post-update state and metadata
 * @throws {Error} When the tag does not exist, the status is invalid, or the
 *   name collides with an existing tag (other than self)
 */
export async function putaiCommerceAdminTagsTagId(props: {
  admin: AdminPayload;
  tagId: string & tags.Format<"uuid">;
  body: IAiCommerceTag.IUpdate;
}): Promise<IAiCommerceTag> {
  const { tagId, body } = props;
  // Acceptable status values enforced per business/business-API rules
  const allowedStatuses = ["active", "under_review", "suspended", "deleted"];
  if (!allowedStatuses.includes(body.status)) {
    throw new Error(`Status must be one of: ${allowedStatuses.join(", ")}`);
  }

  // Find the tag to update
  const tag = await MyGlobal.prisma.ai_commerce_tags.findFirst({
    where: { id: tagId },
  });
  if (!tag) {
    throw new Error("Tag not found");
  }

  // Validate that no other tag uses the intended name
  const nameCollision = await MyGlobal.prisma.ai_commerce_tags.findFirst({
    where: {
      name: body.name,
      NOT: { id: tagId },
    },
  });
  if (nameCollision) {
    throw new Error("Tag name already exists");
  }

  // Update
  const updated = await MyGlobal.prisma.ai_commerce_tags.update({
    where: { id: tagId },
    data: {
      name: body.name,
      status: body.status,
      description:
        body.description === undefined ? undefined : body.description,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return API structure, all dates as branded ISO strings
  return {
    id: updated.id,
    name: updated.name,
    status: updated.status,
    description: updated.description ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
