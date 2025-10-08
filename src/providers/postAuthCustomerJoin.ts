import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCustomerJoin(props: {
  body: IShoppingMallCustomer.IJoin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  const { body } = props;

  // Check for duplicate email (ignore soft-deleted accounts)
  const existing = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: { email: body.email, deleted_at: null },
  });
  if (existing) {
    throw new HttpException("Email already registered.", 409);
  }

  // Hash password
  const password_hash = await PasswordUtil.hash(body.password);

  // Prepare values
  const now = toISOStringSafe(new Date());
  const customer_id = v4();

  // Create customer
  const customer = await MyGlobal.prisma.shopping_mall_customers.create({
    data: {
      id: customer_id,
      email: body.email,
      password_hash,
      full_name: body.full_name,
      phone: body.phone,
      status: "pending",
      email_verified: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Create address
  await MyGlobal.prisma.shopping_mall_customer_addresses.create({
    data: {
      id: v4(),
      customer_id,
      recipient_name: body.address.recipient_name,
      phone: body.address.phone,
      region: body.address.region,
      postal_code: body.address.postal_code,
      address_line1: body.address.address_line1,
      address_line2: body.address.address_line2 ?? null,
      is_default: body.address.is_default,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Issue JWT tokens (access & refresh)
  const payload = { id: customer.id, type: "customer" };
  const accessToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  // Compute expiry from tokens
  const decodeAccess = jwt.decode(accessToken);
  const decodeRefresh = jwt.decode(refreshToken);
  let expired_at = now;
  let refreshable_until = now;
  if (
    decodeAccess &&
    typeof decodeAccess === "object" &&
    "exp" in decodeAccess &&
    decodeAccess.exp
  ) {
    expired_at = toISOStringSafe(new Date(Number(decodeAccess.exp) * 1000));
  }
  if (
    decodeRefresh &&
    typeof decodeRefresh === "object" &&
    "exp" in decodeRefresh &&
    decodeRefresh.exp
  ) {
    refreshable_until = toISOStringSafe(
      new Date(Number(decodeRefresh.exp) * 1000),
    );
  }

  return {
    id: customer.id,
    email: customer.email,
    full_name: customer.full_name,
    phone: customer.phone,
    status: customer.status,
    email_verified: customer.email_verified,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at:
      customer.deleted_at === null
        ? null
        : toISOStringSafe(customer.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expired_at,
      refreshable_until: refreshable_until,
    },
  };
}
