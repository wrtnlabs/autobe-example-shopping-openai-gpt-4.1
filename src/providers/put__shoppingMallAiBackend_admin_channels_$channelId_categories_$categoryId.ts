import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update properties of a channel category, including name, code, order, and
 * parent.
 *
 * Updates details such as code, name, parent, sort order, and description for a
 * channel category. All changes update the updated_at timestamp for audit
 * compliance. Ensures category exists (not deleted), unique code per channel,
 * and parent assignment as per relational constraints. Admin authentication
 * required.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making this request
 * @param props.channelId - UUID of the parent channel the category belongs to
 * @param props.categoryId - UUID of the category to update
 * @param props.body - Partial fields to update (name, code, parent,
 *   description, order)
 * @returns The updated channel category business object
 * @throws {Error} If the category does not exist or is deleted
 */
export async function put__shoppingMallAiBackend_admin_channels_$channelId_categories_$categoryId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendChannelCategory.IUpdate;
}): Promise<IShoppingMallAiBackendChannelCategory> {
  const { channelId, categoryId, body } = props;

  // Find the target category (must exist, must not be deleted, must belong to channel)
  const category =
    await MyGlobal.prisma.shopping_mall_ai_backend_channel_categories.findFirst(
      {
        where: {
          id: categoryId,
          shopping_mall_ai_backend_channel_id: channelId,
          deleted_at: null,
        },
      },
    );
  if (!category) throw new Error("Category not found or deleted");

  // Update fields as provided; skip undefineds, explicit nulls allowed for parent_id/description
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_channel_categories.update({
      where: { id: categoryId },
      data: {
        parent_id: body.parent_id === undefined ? undefined : body.parent_id,
        code: body.code ?? undefined,
        name: body.name ?? undefined,
        description:
          body.description === undefined ? undefined : body.description,
        order: body.order ?? undefined,
        updated_at: now,
      },
    });

  // Return DTO with all date fields as string & tags.Format<'date-time'>
  return {
    id: updated.id,
    shopping_mall_ai_backend_channel_id:
      updated.shopping_mall_ai_backend_channel_id,
    parent_id: updated.parent_id ?? null,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    order: updated.order,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
