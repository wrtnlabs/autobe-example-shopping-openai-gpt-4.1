import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Remove (soft delete) a buyer-owned favorites folder from the system
 * (ai_commerce_favorites_folders).
 *
 * This endpoint soft deletes the specified favorites folder for the
 * authenticated buyer by setting its deleted_at timestamp. It does not
 * physically remove the record, supporting audit, recovery, and compliance.
 * Ownership is strictly enforced: buyers may only delete their own folders, and
 * deleted or non-existent folders are rejected. Business logic does not affect
 * contained favorites; only the folder itself is marked deleted.
 *
 * @param props - Input parameters
 * @param props.buyer - The authenticated buyer performing the deletion
 * @param props.folderId - The UUID of the folder to delete
 * @returns Void (no response body)
 * @throws {Error} If the folder does not exist, is already deleted, or is not
 *   owned by the buyer
 */
export async function deleteaiCommerceBuyerFavoritesFoldersFolderId(props: {
  buyer: BuyerPayload;
  folderId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { buyer, folderId } = props;
  // Look up the folder by its ID and confirm ownership (and not already deleted)
  const folder = await MyGlobal.prisma.ai_commerce_favorites_folders.findFirst({
    where: {
      id: folderId,
      user_id: buyer.id,
      deleted_at: null,
    },
  });
  if (!folder) {
    throw new Error(
      "Folder not found, already deleted, or not owned by buyer.",
    );
  }
  // Soft delete by updating deleted_at
  await MyGlobal.prisma.ai_commerce_favorites_folders.update({
    where: { id: folderId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
