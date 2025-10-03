import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallUserConnection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserConnection";
import { IPageIShoppingMallUserConnection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserConnection";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminUserConnections(props: {
  admin: AdminPayload;
  body: IShoppingMallUserConnection.IRequest;
}): Promise<IPageIShoppingMallUserConnection.ISummary> {
  const body = props.body;
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;
  const offset = (page - 1) * limit;

  const where = {
    ...(body.actor_id !== undefined &&
      body.actor_id !== null && { actor_id: body.actor_id }),
    ...(body.actor_type !== undefined &&
      body.actor_type !== null && { actor_type: body.actor_type }),
    ...(body.channel_id !== undefined &&
      body.channel_id !== null && { channel_id: body.channel_id }),
    ...(body.ip_address !== undefined &&
      body.ip_address !== null && { ip_address: body.ip_address }),
    ...(body.user_agent !== undefined &&
      body.user_agent !== null && { user_agent: body.user_agent }),
    ...(body.auth_context !== undefined &&
      body.auth_context !== null && { auth_context: body.auth_context }),
    ...((body.login_at_from !== undefined && body.login_at_from !== null) ||
    (body.login_at_to !== undefined && body.login_at_to !== null)
      ? {
          login_at: {
            ...(body.login_at_from !== undefined &&
              body.login_at_from !== null && { gte: body.login_at_from }),
            ...(body.login_at_to !== undefined &&
              body.login_at_to !== null && { lte: body.login_at_to }),
          },
        }
      : {}),
    ...((body.logout_at_from !== undefined && body.logout_at_from !== null) ||
    (body.logout_at_to !== undefined && body.logout_at_to !== null)
      ? {
          logout_at: {
            ...(body.logout_at_from !== undefined &&
              body.logout_at_from !== null && { gte: body.logout_at_from }),
            ...(body.logout_at_to !== undefined &&
              body.logout_at_to !== null && { lte: body.logout_at_to }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_user_connections.findMany({
      where,
      orderBy: { login_at: "desc" },
      skip: offset,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_user_connections.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    actor_id: row.actor_id,
    actor_type: row.actor_type,
    channel_id: row.channel_id,
    ip_address: row.ip_address,
    login_at: toISOStringSafe(row.login_at),
    logout_at: row.logout_at ? toISOStringSafe(row.logout_at) : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
