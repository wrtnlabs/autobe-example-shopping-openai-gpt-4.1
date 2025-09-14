import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesFolder";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Retrieve details of a specific favorite folder by ID
 * (ai_commerce_favorites_folders).
 *
 * This operation fetches the details of a single favorite folder by its ID for
 * the authenticated buyer. Only the folder owner can accessing specific folder
 * details; others receive an error. Soft-deleted folders are not visible.
 *
 * @param props - Object containing the authenticated buyer's payload and target
 *   folderId
 * @param props.buyer - The authenticated buyer making the request
 * @param props.folderId - The UUID identifier of the favorites folder to
 *   retrieve
 * @returns Detailed favorite folder information for the user, including all
 *   metadata and organization
 * @throws {Error} If folder is not found or user is not the owner
 */
export async function getaiCommerceBuyerFavoritesFoldersFolderId(props: {
  buyer: BuyerPayload;
  folderId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceFavoritesFolder> {
  const { buyer, folderId } = props;
  const folder = await MyGlobal.prisma.ai_commerce_favorites_folders.findFirst({
    where: {
      id: folderId,
      user_id: buyer.id,
      deleted_at: null,
    },
  });
  if (!folder) {
    throw new Error("Folder not found or access denied");
  }
  return {
    id: folder.id,
    user_id: folder.user_id,
    name: folder.name,
    description: folder.description ?? null,
    created_at: toISOStringSafe(folder.created_at),
    updated_at: toISOStringSafe(folder.updated_at),
    deleted_at: folder.deleted_at ? toISOStringSafe(folder.deleted_at) : null,
  };
}
