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
  body: IShoppingMallAdmin.IJoin;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  const { email, password, name } = props.body;
  // Step 1: Enforce unique admin email per schema
  const exists = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: { email },
  });
  if (exists) {
    throw new HttpException("Email is already registered as admin.", 409);
  }
  // Step 2: Hash password
  const password_hash = await PasswordUtil.hash(password);
  // Step 3: Prepare base info
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;
  const status = "active";
  const kyc_status = "pending";
  // Step 4: Insert admin
  const created = await MyGlobal.prisma.shopping_mall_admins.create({
    data: {
      id,
      email,
      password_hash,
      name,
      status,
      kyc_status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Step 5: JWTs: payload { id, type }
  const access_exp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refresh_exp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const access = jwt.sign(
    { id: created.id, type: "admin" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    { id: created.id, type: "admin" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30d", issuer: "autobe" },
  );
  return {
    id: created.id,
    email: created.email,
    name: created.name,
    status: created.status,
    kyc_status: created.kyc_status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(access_exp),
      refreshable_until: toISOStringSafe(refresh_exp),
    },
  };
}
