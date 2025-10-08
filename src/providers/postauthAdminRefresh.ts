import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminRefresh(props: {
  body: IShoppingMallAdmin.IRefresh;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  const { body } = props;
  // 1. Lookup the session by refresh_token
  const session = await MyGlobal.prisma.shopping_mall_user_sessions.findUnique({
    where: { refresh_token: body.refresh_token },
  });
  if (!session) throw new HttpException("Invalid refresh token.", 401);
  // 2. Check not revoked
  if (session.revoked_at)
    throw new HttpException("Refresh token revoked.", 403);
  // 3. Check not expired
  const nowIso = toISOStringSafe(new Date());
  if (toISOStringSafe(session.expires_at) <= nowIso)
    throw new HttpException("Refresh token expired.", 401);
  // 4. Find admin for this session (only admins can refresh here)
  const admin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: { id: session.user_id },
  });
  if (!admin || admin.status !== "active")
    throw new HttpException("Admin not active or not found.", 403);
  // 5. Issue new access and refresh tokens
  const jwtPayload = { id: admin.id, type: "admin" };
  const accessToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  // Compute expiration times
  const accessExpired = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpired = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // 6. Update the session with new tokens and expiry
  await MyGlobal.prisma.shopping_mall_user_sessions.update({
    where: { id: session.id },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: refreshExpired,
    },
  });
  // 7. Return response
  return {
    id: admin.id,
    email: admin.email,
    full_name: admin.full_name,
    status: admin.status,
    last_login_at: admin.last_login_at
      ? toISOStringSafe(admin.last_login_at)
      : undefined,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at
      ? toISOStringSafe(admin.deleted_at)
      : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpired,
      refreshable_until: refreshExpired,
    },
  };
}
