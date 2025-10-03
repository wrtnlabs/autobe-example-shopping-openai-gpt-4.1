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

export async function putShoppingMallAdminUserConnectionsUserConnectionId(props: {
  admin: AdminPayload;
  userConnectionId: string & tags.Format<"uuid">;
  body: IShoppingMallUserConnection.IUpdate;
}): Promise<IShoppingMallUserConnection> {
  // Only update allowed fields (user_agent, auth_context)
  const updated = await MyGlobal.prisma.shopping_mall_user_connections.update({
    where: {
      id: props.userConnectionId,
    },
    data: {
      user_agent: Object.prototype.hasOwnProperty.call(props.body, "user_agent")
        ? props.body.user_agent
        : undefined,
      auth_context: Object.prototype.hasOwnProperty.call(
        props.body,
        "auth_context",
      )
        ? props.body.auth_context
        : undefined,
    },
  });

  return {
    id: updated.id,
    actor_id: updated.actor_id,
    actor_type: updated.actor_type,
    channel_id: updated.channel_id,
    ip_address: updated.ip_address,
    user_agent: Object.prototype.hasOwnProperty.call(updated, "user_agent")
      ? updated.user_agent
      : undefined,
    login_at: toISOStringSafe(updated.login_at),
    logout_at:
      typeof updated.logout_at !== "undefined" && updated.logout_at !== null
        ? toISOStringSafe(updated.logout_at)
        : updated.logout_at === null
          ? null
          : undefined,
    auth_context: updated.auth_context,
    created_at: toISOStringSafe(updated.created_at),
  };
}
