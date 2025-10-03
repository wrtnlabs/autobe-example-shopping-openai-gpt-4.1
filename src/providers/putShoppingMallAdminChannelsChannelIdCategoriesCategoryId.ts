import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminChannelsChannelIdCategoriesCategoryId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallChannelCategory.IUpdate;
}): Promise<IShoppingMallChannelCategory> {
  const { channelId, categoryId, body } = props;

  // Step 1: Find the target category
  const category =
    await MyGlobal.prisma.shopping_mall_channel_categories.findFirst({
      where: {
        id: categoryId,
        shopping_mall_channel_id: channelId,
        deleted_at: null,
      },
    });
  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  // Step 2: Check for unique code in channel if code is being updated
  if (body.code !== undefined) {
    const duplicate =
      await MyGlobal.prisma.shopping_mall_channel_categories.findFirst({
        where: {
          code: body.code,
          shopping_mall_channel_id: channelId,
          deleted_at: null,
          NOT: { id: categoryId },
        },
      });
    if (duplicate) {
      throw new HttpException("Duplicate code in channel", 409);
    }
  }

  // Step 3: Parent category validation (cycle, existence, deleted check, same channel)
  if (body.parent_id !== undefined) {
    if (body.parent_id === categoryId) {
      throw new HttpException(
        "Cannot set category parent to itself (cycle)",
        400,
      );
    }
    if (body.parent_id !== null) {
      const parent =
        await MyGlobal.prisma.shopping_mall_channel_categories.findFirst({
          where: {
            id: body.parent_id,
            shopping_mall_channel_id: channelId,
            deleted_at: null,
          },
        });
      if (!parent) {
        throw new HttpException("Parent category not found or deleted", 400);
      }
      // Cycle detection: can't set parent_id to any of own descendants
      // We'll check if the target category's id exists in the ancestor chain of the new parent
      let ancestorId = parent.parent_id;
      while (ancestorId) {
        if (ancestorId === categoryId) {
          throw new HttpException(
            "Cannot create circular parent relations",
            400,
          );
        }
        const ancestor =
          await MyGlobal.prisma.shopping_mall_channel_categories.findFirst({
            where: {
              id: ancestorId,
              shopping_mall_channel_id: channelId,
              deleted_at: null,
            },
            select: { parent_id: true },
          });
        ancestorId = ancestor?.parent_id ?? null;
      }
    }
  }

  // Step 4: Update values
  const updated = await MyGlobal.prisma.shopping_mall_channel_categories.update(
    {
      where: { id: categoryId },
      data: {
        parent_id: body.parent_id ?? undefined,
        code: body.code ?? undefined,
        name: body.name ?? undefined,
        description: body.description ?? undefined,
        display_order: body.display_order ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

  // Step 5: Return updated category, converted to API type
  return {
    id: updated.id,
    shopping_mall_channel_id: updated.shopping_mall_channel_id,
    parent_id: updated.parent_id ?? undefined,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? undefined,
    display_order: updated.display_order,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
  // Note: Implement audit logging for change tracking here (e.g., insert into audit table)
}
