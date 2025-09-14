import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceChannelSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannelSetting";
import { IPageIAiCommerceChannelSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceChannelSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve channel settings for a specified channel (admin only)
 *
 * Enables secure retrieval of all settings attached to a specific aiCommerce
 * channel, identified by channelId. Supports pagination and advanced filtering
 * by key or value—for example, to find all theme configurations or feature
 * toggles for a channel. Only admins may access these details. Audit logs track
 * all accesses to support compliance and operational analytics.
 *
 * @param props - The parameter object
 * @param props.admin - The authenticated admin making the request
 * @param props.channelId - UUID of the channel whose settings to fetch
 * @param props.body - Search, filter, and pagination options
 * @returns Paginated list of settings for the channel
 *   (IPageIAiCommerceChannelSetting)
 * @throws {Error} When the channel does not exist
 */
export async function patchaiCommerceAdminChannelsChannelIdSettings(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  body: IAiCommerceChannelSetting.IRequest;
}): Promise<IPageIAiCommerceChannelSetting> {
  const { channelId, body } = props;

  // 1. Verify channel existence
  const channel = await MyGlobal.prisma.ai_commerce_channels.findFirst({
    where: { id: channelId },
  });
  if (!channel) throw new Error("Channel not found");

  // 2. Pagination: default to page 1, limit 20 if not provided; enforce integer >=1
  const page = typeof body.page === "number" && body.page >= 1 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit >= 1 && body.limit <= 100
      ? body.limit
      : 20;
  const skip = (page - 1) * limit;

  // 3. Filtering criteria
  const queryWhere = {
    ai_commerce_channel_id: channelId,
    deleted_at: null,
    ...(body.key !== undefined &&
      body.key !== null && { key: { contains: body.key } }),
    ...(body.value !== undefined &&
      body.value !== null && { value: { contains: body.value } }),
  };

  // 4. Sorting logic
  let orderBy;
  if (typeof body.sort === "string" && body.sort.trim().length > 0) {
    const [fieldMaybe, orderMaybe] = body.sort.trim().split(/\s+/);
    const allowedFields = ["created_at", "updated_at", "key", "value"];
    const allowedOrder = ["asc", "desc"];
    const field = allowedFields.includes(fieldMaybe)
      ? fieldMaybe
      : "created_at";
    const direction = allowedOrder.includes((orderMaybe || "").toLowerCase())
      ? orderMaybe.toLowerCase()
      : "desc";
    orderBy = { [field]: direction };
  } else {
    orderBy = { created_at: "desc" };
  }

  // 5. Query DB
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.ai_commerce_channel_settings.count({ where: queryWhere }),
    MyGlobal.prisma.ai_commerce_channel_settings.findMany({
      where: queryWhere,
      orderBy,
      skip,
      take: limit,
    }),
  ]);

  // 6. Map results to IAiCommerceChannelSetting, branding & date conversion
  const data = rows.map(
    (setting): IAiCommerceChannelSetting => ({
      id: setting.id,
      ai_commerce_channel_id: setting.ai_commerce_channel_id,
      key: setting.key,
      value: setting.value,
      created_at: toISOStringSafe(setting.created_at),
      updated_at: toISOStringSafe(setting.updated_at),
      deleted_at:
        setting.deleted_at !== null && setting.deleted_at !== undefined
          ? toISOStringSafe(setting.deleted_at)
          : undefined, // Optional+nullable field: undefined (not present), not null
    }),
  );

  // 7. Pagination metadata (must use Number() to avoid typia tag/brand errors)
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / limit)),
    },
    data,
  };
}
