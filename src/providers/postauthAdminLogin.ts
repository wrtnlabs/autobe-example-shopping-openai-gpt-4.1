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

export async function postAuthAdminLogin(props: {
  body: IShoppingMallAdmin.ILogin;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  const now = toISOStringSafe(new Date());
  const { email, password } = props.body;
  // Find admin by email (unique) and not deleted
  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      email,
      deleted_at: null,
    },
  });
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Check password
  const valid = await PasswordUtil.verify(password, admin.password_hash);
  if (!valid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Check status: only 'active' can login
  if (admin.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }
  // Update last_login_at
  await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: admin.id },
    data: { last_login_at: now },
  });
  // JWT tokens
  const accessPayload = { id: admin.id, type: "admin" };
  const refreshPayload = { id: admin.id, type: "admin" };
  const accessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  // Calculate expiry
  const expired_at = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + 3600 * 24 * 7 * 1000),
  );
  // Response DTO
  return {
    id: admin.id,
    email: admin.email,
    full_name: admin.full_name,
    status: admin.status,
    last_login_at: now,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at,
      refreshable_until,
    },
  };
}
