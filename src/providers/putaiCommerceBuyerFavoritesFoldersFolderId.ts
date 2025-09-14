import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesFolder";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Update the name or description of a buyer-owned favorites folder.
 *
 * This function allows an authenticated buyer to update the organizational
 * metadata of a favorites folder, enforcing ownership and uniqueness of folder
 * names within the buyer's account. Edits are permitted only to the name or
 * description fields. If the folder does not exist, is deleted, or is not owned
 * by the buyer, or if the requested name would duplicate another folder for the
 * buyer, an error is thrown. All timestamps are handled as ISO date-time
 * strings.
 *
 * @param props The props for the folder update.
 * @param props.buyer The authenticated buyer's payload.
 * @param props.folderId The ID of the favorites folder to update.
 * @param props.body The update object, potentially containing a new name and/or
 *   description.
 * @returns The updated favorites folder entity, conforming to
 *   IAiCommerceFavoritesFolder.
 * @throws Error if the folder cannot be found, the buyer does not own it, or
 *   the new name is not unique.
 */
export async function putaiCommerceBuyerFavoritesFoldersFolderId(props: {
  buyer: BuyerPayload;
  folderId: string & tags.Format<"uuid">;
  body: IAiCommerceFavoritesFolder.IUpdate;
}): Promise<IAiCommerceFavoritesFolder> {
  const { buyer, folderId, body } = props;

  // 1. Fetch folder with ownership check (and not deleted)
  const folder = await MyGlobal.prisma.ai_commerce_favorites_folders.findFirst({
    where: {
      id: folderId,
      user_id: buyer.id,
      deleted_at: null,
    },
  });
  if (!folder) {
    throw new Error("Folder not found or access denied.");
  }

  // 2. If name is changing, enforce uniqueness within buyer's folders
  if (typeof body.name === "string" && body.name !== folder.name) {
    const nameConflict =
      await MyGlobal.prisma.ai_commerce_favorites_folders.findFirst({
        where: {
          user_id: buyer.id,
          name: body.name,
          id: { not: folderId },
          deleted_at: null,
        },
      });
    if (nameConflict) {
      throw new Error(
        "A folder with this name already exists. Please choose a unique name.",
      );
    }
  }

  // 3. Update only provided fields (and updated_at)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.ai_commerce_favorites_folders.update({
    where: { id: folderId },
    data: {
      name: body.name ?? undefined,
      description:
        body.description !== undefined ? body.description : undefined,
      updated_at: now,
    },
  });

  // 4. Return updated folder in IAiCommerceFavoritesFolder shape
  return {
    id: updated.id,
    user_id: updated.user_id,
    name: updated.name,
    description: updated.description ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
