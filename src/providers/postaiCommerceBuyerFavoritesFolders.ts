import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesFolder";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Create a new favorites folder for grouping saved items for a buyer
 * (ai_commerce_favorites_folders table).
 *
 * This endpoint creates an organizational folder for an authenticated buyer to
 * group their saved/favorite items. Each folder's name must be unique per user
 * and is immediately available for use after creation. Folder descriptions are
 * optional and help clarify purpose. If a folder with the same name already
 * exists for the requesting user, an error is thrown.
 *
 * Security: Only authenticated buyers may create a favorites folder.
 *
 * @param props - The parameter object containing buyer: The authenticated
 *   buyer's payload (must be active, non-deleted) body: The new folder's
 *   details (name, optional description)
 * @returns The IAiCommerceFavoritesFolder DTO representing the newly created
 *   folder, with all fields populated and correctly typed
 * @throws {Error} If a folder with the same name already exists for this user,
 *   or if not authenticated as a buyer
 */
export async function postaiCommerceBuyerFavoritesFolders(props: {
  buyer: BuyerPayload;
  body: IAiCommerceFavoritesFolder.ICreate;
}): Promise<IAiCommerceFavoritesFolder> {
  // Step 1: Check if this user already has a folder with the given name
  const duplicate =
    await MyGlobal.prisma.ai_commerce_favorites_folders.findFirst({
      where: {
        user_id: props.buyer.id,
        name: props.body.name,
      },
    });
  if (duplicate !== null) {
    throw new Error(
      "A favorites folder with this name already exists for your account.",
    );
  }
  // Step 2: Prepare IDs and timestamps
  const id: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Step 3: Create the folder record in DB
  const created = await MyGlobal.prisma.ai_commerce_favorites_folders.create({
    data: {
      id: id,
      user_id: props.buyer.id,
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: now,
      updated_at: now,
    },
  });
  // Step 4: Map DB record to API DTO, with all field types and null/undefined handling
  return {
    id: created.id,
    user_id: created.user_id,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
