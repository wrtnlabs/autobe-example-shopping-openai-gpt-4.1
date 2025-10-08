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

export async function postAuthAdminJoin(props: {
  body: IShoppingMallAdmin.ICreate;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  const { email, password, full_name } = props.body;
  const status = props.body.status ?? "pending";

  // Check for duplicate admin email
  const exists = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { email },
  });
  if (exists) {
    throw new HttpException("이미 등록된 관리자 이메일입니다.", 409);
  }

  // Hash the password securely
  const password_hash = await PasswordUtil.hash(password);
  const now = toISOStringSafe(new Date());

  // Insert the new admin record
  const created = await MyGlobal.prisma.shopping_mall_admins.create({
    data: {
      id: v4(),
      email,
      password_hash,
      full_name,
      status,
      two_factor_secret: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      last_login_at: null,
    },
  });

  // Token expiration calculation
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // JWT token generation (strict payload: id, type)
  const payload = { id: created.id, type: "admin" };
  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(
    { ...payload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  const token = {
    access,
    refresh,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  return {
    id: created.id,
    email: created.email,
    full_name: created.full_name,
    status: created.status,
    last_login_at: null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
    token,
  };
}
