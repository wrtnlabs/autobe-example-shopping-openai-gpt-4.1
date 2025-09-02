import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a channel section while preserving audit history and evidence.
 *
 * This operation performs a soft delete on the given section by setting the
 * deleted_at timestamp, preserving history for audit and compliance purposes.
 * Only active (not previously deleted) sections can be deleted, and attempts to
 * delete sections with active children (not soft-deleted) will fail.
 * Idempotency is enforced: trying to delete an already-deleted section will
 * succeed silently (no action).
 *
 * Security: This operation is restricted to admins only.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the deletion
 * @param props.channelId - UUID of the parent channel
 * @param props.sectionId - UUID of the section to delete
 * @returns Void
 * @throws {Error} When the section does not exist or the section has active
 *   child sections
 */
export async function delete__shoppingMallAiBackend_admin_channels_$channelId_sections_$sectionId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  sectionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, channelId, sectionId } = props;

  // Step 1: Fetch only non-deleted section
  const section =
    await MyGlobal.prisma.shopping_mall_ai_backend_channel_sections.findFirst({
      where: {
        id: sectionId,
        shopping_mall_ai_backend_channel_id: channelId,
        deleted_at: null,
      },
    });

  if (!section) {
    // Step 2: Check idempotency - already deleted?
    const alreadyDeleted =
      await MyGlobal.prisma.shopping_mall_ai_backend_channel_sections.findFirst(
        {
          where: {
            id: sectionId,
            shopping_mall_ai_backend_channel_id: channelId,
            deleted_at: { not: null },
          },
        },
      );
    if (alreadyDeleted) return; // Section already deleted, idempotency: succeed silently
    throw new Error("Section not found");
  }

  // Step 3: Ensure no active children exist (business rule)
  const activeChildCount =
    await MyGlobal.prisma.shopping_mall_ai_backend_channel_sections.count({
      where: {
        parent_id: sectionId,
        deleted_at: null,
      },
    });
  if (activeChildCount > 0) {
    throw new Error(
      "Cannot delete section: active child sections exist (must delete or move children first)",
    );
  }

  // Step 4: Soft delete the section (set deleted_at)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_ai_backend_channel_sections.update({
    where: { id: sectionId },
    data: { deleted_at: now },
  });

  return;
}
