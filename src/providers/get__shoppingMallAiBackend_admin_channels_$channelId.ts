import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information about a sales channel by its ID (admin only).
 *
 * Returns the full record for the sales channel, including all business,
 * regulatory, and configuration context. Requires admin authentication, filters
 * out soft-deleted channels.
 *
 * @param props - Admin: The authenticated system admin requesting the channel
 *   detail channelId: Unique identifier (UUID) of the sales channel
 * @returns IShoppingMallAiBackendChannel - The detailed channel entity record
 * @throws {Error} If the channel is not found or is soft-deleted
 */
export async function get__shoppingMallAiBackend_admin_channels_$channelId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendChannel> {
  const { admin, channelId } = props;

  // Query for non-deleted channel by ID
  const record =
    await MyGlobal.prisma.shopping_mall_ai_backend_channels.findFirst({
      where: {
        id: channelId,
        deleted_at: null,
      },
    });

  if (!record) {
    throw new Error("Channel not found");
  }

  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description ?? null,
    country: record.country,
    currency: record.currency,
    language: record.language,
    timezone: record.timezone,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
