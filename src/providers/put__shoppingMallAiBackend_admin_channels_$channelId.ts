import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Updates an existing sales channel with new business or configuration
 * information.
 *
 * Uses the unique channel ID to locate the record. Only channels not
 * soft-deleted (deleted_at is null) may be updated. Allows changing branding,
 * regional, or compliance attributes. The updated_at field is always refreshed
 * to the current timestamp. This operation validates for uniqueness of 'code',
 * region suitability, and not-found/deleted status. Only administrators may
 * perform this operation.
 *
 * @param props - The update properties
 * @param props.admin - AdminPayload for authorization; must be a valid, active
 *   admin
 * @param props.channelId - Unique identifier (UUID) of the channel to update
 * @param props.body - Partial update object
 *   (IShoppingMallAiBackendChannel.IUpdate)
 * @returns The updated channel entity (IShoppingMallAiBackendChannel)
 * @throws {Error} If the channel does not exist, is deleted, or if the new code
 *   would conflict with another channel
 */
export async function put__shoppingMallAiBackend_admin_channels_$channelId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendChannel.IUpdate;
}): Promise<IShoppingMallAiBackendChannel> {
  const { admin, channelId, body } = props;

  // Fetch the channel; must not be deleted
  const channel =
    await MyGlobal.prisma.shopping_mall_ai_backend_channels.findFirst({
      where: { id: channelId, deleted_at: null },
    });
  if (!channel) throw new Error("Channel not found or already deleted");

  // Code uniqueness check if code is being updated (to a different value)
  if (body.code !== undefined && body.code !== channel.code) {
    const codeExists =
      await MyGlobal.prisma.shopping_mall_ai_backend_channels.findFirst({
        where: {
          code: body.code,
          id: { not: channelId },
          deleted_at: null,
        },
      });
    if (codeExists) throw new Error("Channel code already exists");
  }

  const now = toISOStringSafe(new Date());

  // Do the update (inline input, no intermediate variables)
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_channels.update({
      where: { id: channelId },
      data: {
        code: body.code ?? undefined,
        name: body.name ?? undefined,
        description:
          body.description !== undefined ? body.description : undefined,
        country: body.country ?? undefined,
        currency: body.currency ?? undefined,
        language: body.language ?? undefined,
        timezone: body.timezone ?? undefined,
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    description: updated.description !== undefined ? updated.description : null,
    country: updated.country,
    currency: updated.currency,
    language: updated.language,
    timezone: updated.timezone,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== undefined && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
