import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new business category under a sales channel, scoping code, name, and
 * navigation properties.
 *
 * This endpoint allows an admin to define a new business/category taxonomy node
 * under a given sales channel. It validates code uniqueness within the channel
 * and, if the category is a child node, confirms the parent exists (and is not
 * soft deleted).
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the operation
 * @param props.channelId - UUID of the target channel under which the category
 *   will be created
 * @param props.body - Data for the new channel category (code, name, order,
 *   description, parent_id)
 * @returns Newly created channel category with all business/audit fields
 * @throws {Error} When channelId and body.shopping_mall_ai_backend_channel_id
 *   do not match
 * @throws {Error} When the parent_id is provided but does not exist, is
 *   soft-deleted, or is not in the channel
 * @throws {Error} When a duplicate code exists within the channel
 */
export async function post__shoppingMallAiBackend_admin_channels_$channelId_categories(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendChannelCategory.ICreate;
}): Promise<IShoppingMallAiBackendChannelCategory> {
  const { admin, channelId, body } = props;

  // 1. Validate channel ID in path and body must match
  if (body.shopping_mall_ai_backend_channel_id !== channelId) {
    throw new Error("Channel ID in the path and body must match.");
  }

  // 2. If parent_id is given, check if it exists, is non-deleted, and belongs to the same channel
  if (body.parent_id !== undefined && body.parent_id !== null) {
    const parent =
      await MyGlobal.prisma.shopping_mall_ai_backend_channel_categories.findFirst(
        {
          where: {
            id: body.parent_id,
            shopping_mall_ai_backend_channel_id: channelId,
            deleted_at: null,
          },
        },
      );
    if (!parent) {
      throw new Error(
        "Parent category does not exist, is deleted, or is not in the target channel.",
      );
    }
  }

  // 3. Check code uniqueness: must not already exist for this channel
  const existing =
    await MyGlobal.prisma.shopping_mall_ai_backend_channel_categories.findFirst(
      {
        where: {
          shopping_mall_ai_backend_channel_id: channelId,
          code: body.code,
        },
      },
    );
  if (existing) {
    throw new Error("Category code already exists within this channel.");
  }

  // 4. Prepare values
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const categoryId: string & tags.Format<"uuid"> = v4();

  // 5. Create new category
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_channel_categories.create({
      data: {
        id: categoryId,
        shopping_mall_ai_backend_channel_id: channelId,
        parent_id: body.parent_id ?? null,
        code: body.code,
        name: body.name,
        description: body.description ?? null,
        order: body.order,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    shopping_mall_ai_backend_channel_id:
      created.shopping_mall_ai_backend_channel_id,
    parent_id: created.parent_id,
    code: created.code,
    name: created.name,
    description: created.description,
    order: created.order,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
