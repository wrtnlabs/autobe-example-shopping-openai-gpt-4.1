import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesFolder";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve details of a specific favorite folder by ID
 * (ai_commerce_favorites_folders).
 *
 * Fetches metadata and detailed information for a user's favorite folder,
 * including name, description, and organizational state. Only the seller who
 * owns the folder can access it. The function ensures the folder is not
 * soft-deleted and performs strict ownership validation.
 *
 * @param props - Object with seller authentication payload and the folderId
 *   string
 * @param props.seller - Authenticated SellerPayload (must match owner of the
 *   folder)
 * @param props.folderId - Unique identifier for the
 *   ai_commerce_favorites_folders record
 * @returns Full IAiCommerceFavoritesFolder, with all timestamps and nullable
 *   values populated
 * @throws {Error} If folder not found, soft-deleted, or not owned by seller
 *   (forbidden)
 */
export async function getaiCommerceSellerFavoritesFoldersFolderId(props: {
  seller: SellerPayload;
  folderId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceFavoritesFolder> {
  const { seller, folderId } = props;
  const folder = await MyGlobal.prisma.ai_commerce_favorites_folders.findFirst({
    where: {
      id: folderId,
      user_id: seller.id,
      deleted_at: null,
    },
  });
  if (!folder) throw new Error("Folder not found or access denied");
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
