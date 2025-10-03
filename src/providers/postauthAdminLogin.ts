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
  const { email, password } = props.body;

  // Step 1: Find admin by email (not deleted)
  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { email, deleted_at: null },
  });

  // Step 2: Validate admin status/state (must be active, verified, not deleted)
  if (
    !admin ||
    admin.status !== "active" ||
    admin.kyc_status !== "verified" ||
    admin.deleted_at !== null
  ) {
    throw new HttpException(
      "Invalid credentials or account not active/verified",
      401,
    );
  }

  // Step 3: Validate password
  const passwordHash = admin.password_hash;
  const passwordValid =
    typeof passwordHash === "string" &&
    passwordHash.length > 0 &&
    (await PasswordUtil.verify(password, passwordHash));
  if (!passwordValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Step 4: Prepare expiration date strings (ISO - do not use Date type variables)
  const nowMs = Date.now();
  const accessExpIso = toISOStringSafe(new Date(nowMs + 60 * 60 * 1000)); // 1h
  const refreshExpIso = toISOStringSafe(
    new Date(nowMs + 7 * 24 * 60 * 60 * 1000),
  ); // 7d

  // Step 5: Issue JWT tokens
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

  // Token structure
  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpIso,
    refreshable_until: refreshExpIso,
  };

  // Compose response strictly
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    status: admin.status,
    kyc_status: admin.kyc_status,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    token,
  };
}
