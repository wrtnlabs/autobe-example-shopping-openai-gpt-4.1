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
  const { refreshToken } = props.body;
  let decoded: unknown;
  try {
    decoded = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (err) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (
    !decoded ||
    typeof decoded !== "object" ||
    !("id" in decoded) ||
    !("type" in decoded) ||
    decoded["type"] !== "admin"
  ) {
    throw new HttpException("Invalid token payload", 401);
  }
  const adminId = typia.assert<string>(decoded["id"]);
  const admin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: { id: adminId },
  });
  if (!admin) {
    throw new HttpException("Admin not found", 404);
  }
  if (
    admin.status !== "active" ||
    admin.deleted_at !== null ||
    (admin.kyc_status !== "verified" && admin.kyc_status !== "pending")
  ) {
    throw new HttpException("Admin not eligible for token refresh", 403);
  }
  const accessExpire = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const now = toISOStringSafe(new Date());
  const accessToken = jwt.sign(
    { id: admin.id, type: "admin" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshTokenNew = jwt.sign(
    { id: admin.id, type: "admin" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.shopping_mall_admin_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: admin.id,
      snapshot_data: JSON.stringify({ ...admin, updated_at: now }),
      created_at: now,
    },
  });
  await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: admin.id },
    data: { updated_at: now },
  });
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    status: admin.status,
    kyc_status: admin.kyc_status,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: now,
    deleted_at:
      admin.deleted_at !== null ? toISOStringSafe(admin.deleted_at) : undefined,
    token: {
      access: accessToken,
      refresh: refreshTokenNew,
      expired_at: toISOStringSafe(accessExpire),
      refreshable_until: toISOStringSafe(refreshExpire),
    },
  };
}
