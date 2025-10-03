import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallUserConnection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserConnection";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminUserConnectionsUserConnectionId(props: {
  admin: AdminPayload;
  userConnectionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallUserConnection> {
  const record =
    await MyGlobal.prisma.shopping_mall_user_connections.findUnique({
      where: { id: props.userConnectionId },
    });
  if (!record) {
    throw new HttpException("User connection record not found", 404);
  }
  return {
    id: record.id,
    actor_id: record.actor_id,
    actor_type: record.actor_type,
    channel_id: record.channel_id,
    ip_address: record.ip_address,
    user_agent: record.user_agent === null ? undefined : record.user_agent,
    login_at: toISOStringSafe(record.login_at),
    logout_at: record.logout_at ? toISOStringSafe(record.logout_at) : undefined,
    auth_context: record.auth_context,
    created_at: toISOStringSafe(record.created_at),
  };
}
