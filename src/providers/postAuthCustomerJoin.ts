import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCustomerJoin(props: {
  body: IShoppingMallCustomer.IJoin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  const now = toISOStringSafe(new Date());
  const customerId = v4();
  const { shopping_mall_channel_id, email, password, name, phone } = props.body;

  // 1. Check for duplicate email within the channel
  const exists = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: { shopping_mall_channel_id, email },
    select: { id: true },
  });
  if (exists) {
    throw new HttpException(
      "Duplicate registration: email is already registered in this channel",
      409,
    );
  }

  // 2. Hash password if provided, null for OAuth or no password
  let password_hash: string | null = null;
  if (typeof password === "string" && password.length > 0) {
    password_hash = await PasswordUtil.hash(password);
  }

  // 3. Insert new customer
  const created = await MyGlobal.prisma.shopping_mall_customers.create({
    data: {
      id: customerId,
      shopping_mall_channel_id,
      email,
      password_hash,
      // handle phone: can be undefined (missing), null, or string. Don't include if undefined
      ...(phone !== undefined ? { phone } : {}),
      name,
      status: "active",
      kyc_status: "pending",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_mall_channel_id: true,
      email: true,
      phone: true,
      name: true,
      status: true,
      kyc_status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  // 4. JWT token generation (access: 1h, refresh: 7d)
  const accessExp = 60 * 60; // 1h seconds
  const refreshExp = 60 * 60 * 24 * 7; // 7d seconds
  const issued = Date.now();
  const expired_at = toISOStringSafe(new Date(issued + accessExp * 1000));
  const refreshable_until = toISOStringSafe(
    new Date(issued + refreshExp * 1000),
  );
  const payload = { id: created.id, type: "customer" };
  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: accessExp,
    issuer: "autobe",
  });
  const refresh = jwt.sign(
    { ...payload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: refreshExp,
      issuer: "autobe",
    },
  );

  return {
    id: created.id,
    shopping_mall_channel_id: created.shopping_mall_channel_id,
    email: created.email,
    // If phone is explicitly null, keep null. If undefined, omit. If value, return as is
    ...(created.phone !== undefined ? { phone: created.phone } : {}),
    name: created.name,
    status: created.status,
    kyc_status: created.kyc_status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    // deleted_at is nullable (DateTime? in schema, optional in DTO): null if null, undefined if omitted
    ...(created.deleted_at !== undefined
      ? {
          deleted_at:
            created.deleted_at === null
              ? null
              : toISOStringSafe(created.deleted_at),
        }
      : {}),
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
  };
}
