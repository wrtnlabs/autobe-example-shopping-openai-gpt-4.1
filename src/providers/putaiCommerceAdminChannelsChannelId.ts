import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannel";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing aiCommerce sales channel (admin only)
 *
 * Updates the configuration, display attributes, and operational/workflow
 * status for an existing ai_commerce_channels entity, identified by its UUID.
 * Only fields allowed in the schema and request body (name, locale, is_active,
 * business_status) may be changed. The channel's unique code and creation
 * timestamp are immutable and cannot be updated. Only system administrators can
 * perform this operation, as enforced by the AdminPayload contract. All
 * date/datetime fields are returned as ISO-8601 formatted strings according to
 * the API contract.
 *
 * @param props - The request props for channel update
 * @param props.admin - Authenticated system administrator (per AdminAuth)
 * @param props.channelId - UUID of the ai_commerce_channels to update
 * @param props.body - Fields to update (only mutable ones per schema)
 * @returns The updated channel reflecting persisted state after mutation
 * @throws {Error} When the channel does not exist or the update is invalid
 */
export async function putaiCommerceAdminChannelsChannelId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  body: IAiCommerceChannel.IUpdate;
}): Promise<IAiCommerceChannel> {
  const { channelId, body } = props;
  // Find channel; error if not found
  const channel = await MyGlobal.prisma.ai_commerce_channels.findFirst({
    where: { id: channelId },
  });
  if (!channel) throw new Error("Channel not found");

  // Prepare update fields: set only if supplied
  const updateInput = {
    name: body.name ?? undefined,
    locale: body.locale ?? undefined,
    is_active: body.is_active ?? undefined,
    business_status: body.business_status ?? undefined,
    updated_at: body.updated_at ?? toISOStringSafe(new Date()),
  };

  // Update channel
  const updated = await MyGlobal.prisma.ai_commerce_channels.update({
    where: { id: channelId },
    data: updateInput,
  });

  // Return exact IAiCommerceChannel (convert all dates to branded strings)
  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    locale: updated.locale,
    is_active: updated.is_active,
    business_status: updated.business_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    // Soft delete: only included if present (undefined for active)
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
