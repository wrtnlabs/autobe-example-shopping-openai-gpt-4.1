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

export async function postAuthCustomerLogin(props: {
  body: IShoppingMallCustomer.ILogin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  const { email, password } = props.body;
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: { email, deleted_at: null },
  });
  if (!customer) throw new HttpException("Invalid credentials.", 404);
  if (customer.status !== "active")
    throw new HttpException("Account is not active.", 403);
  if (!customer.email_verified)
    throw new HttpException("Email address not verified.", 403);
  const passwordMatch = await PasswordUtil.verify(
    password,
    customer.password_hash,
  );
  if (!passwordMatch) throw new HttpException("Invalid credentials.", 401);
  const jwtPayload = { id: customer.id, type: "customer" };
  const nowSeconds = Math.floor(Date.now() / 1000);
  const accessExpiresInSec = 60 * 60;
  const refreshExpiresInSec = 60 * 60 * 24 * 7;
  const accessToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: accessExpiresInSec,
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: refreshExpiresInSec,
    issuer: "autobe",
  });
  const accessExpireIso = toISOStringSafe(
    new Date((nowSeconds + accessExpiresInSec) * 1000),
  );
  const refreshExpireIso = toISOStringSafe(
    new Date((nowSeconds + refreshExpiresInSec) * 1000),
  );
  // (Removed incorrect audit update of last_login_at field, wasn't in schema)
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
        ? undefined
        : toISOStringSafe(customer.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpireIso,
      refreshable_until: refreshExpireIso,
    },
  };
}
