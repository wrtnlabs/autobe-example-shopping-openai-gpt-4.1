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
  const { shopping_mall_channel_id, email, password } = props.body;

  // Query user by channel and email
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      shopping_mall_channel_id,
      email,
    },
  });

  // Fail if account not found
  if (!customer) throw new HttpException("Invalid credentials.", 401);
  // Fail if password not set
  if (!customer.password_hash)
    throw new HttpException("No password set for this user.", 401);
  // Fail if account soft-deleted
  if (customer.deleted_at)
    throw new HttpException("Account has been deleted.", 403);
  // Fail if suspended or withdrawn
  if (customer.status === "suspended" || customer.status === "withdrawn") {
    throw new HttpException("Account is suspended or withdrawn.", 403);
  }

  // Password check
  const valid = await PasswordUtil.verify(password, customer.password_hash);
  if (!valid) throw new HttpException("Invalid credentials.", 401);

  // JWT setup per CustomerPayload (id, type)
  const payload = { id: customer.id, type: "customer" };

  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  // Calculate expiry timestamps as branded strings
  const expired_at = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const token = {
    access,
    refresh,
    expired_at,
    refreshable_until,
  };

  // Provide output per schema contract, dates converted
  return {
    id: customer.id,
    shopping_mall_channel_id: customer.shopping_mall_channel_id,
    email: customer.email,
    phone:
      customer.phone !== undefined && customer.phone !== null
        ? customer.phone
        : undefined,
    name: customer.name,
    status: customer.status,
    kyc_status: customer.kyc_status,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at: customer.deleted_at
      ? toISOStringSafe(customer.deleted_at)
      : undefined,
    token,
  };
}
