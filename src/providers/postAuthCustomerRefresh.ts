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

export async function postAuthCustomerRefresh(props: {
  body: IShoppingMallCustomer.IRefresh;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  const { refresh_token } = props.body;

  let decoded: any;
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (err) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Must have valid id and type from CustomerPayload
  if (
    !decoded ||
    typeof decoded.id !== "string" ||
    decoded.type !== "customer"
  ) {
    throw new HttpException("Malformed refresh token", 401);
  }

  // Fetch customer
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: decoded.id },
  });
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }

  // Check customer status and not deleted
  if (
    customer.status === "suspended" ||
    customer.status === "withdrawn" ||
    customer.deleted_at !== null
  ) {
    throw new HttpException("Customer not eligible for token refresh", 403);
  }

  // Generate new tokens
  const accessTokenPayload = {
    id: customer.id,
    type: "customer",
  };
  const nowUnix = Math.floor(Date.now() / 1000);
  const accessExp = nowUnix + 60 * 60; // 1 hour
  const refreshExp = nowUnix + 60 * 60 * 24 * 7; // 7 days

  const access = jwt.sign(accessTokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(accessTokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  // Expirations as date-time strings
  const accessExpiredAt = toISOStringSafe(new Date(accessExp * 1000));
  const refreshExpiredAt = toISOStringSafe(new Date(refreshExp * 1000));

  // Prepare response
  return {
    id: customer.id,
    shopping_mall_channel_id: customer.shopping_mall_channel_id,
    email: customer.email,
    phone:
      customer.phone === null || typeof customer.phone === "undefined"
        ? null
        : customer.phone,
    name: customer.name,
    status: customer.status,
    kyc_status: customer.kyc_status,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at:
      typeof customer.deleted_at === "undefined" || customer.deleted_at === null
        ? undefined
        : toISOStringSafe(customer.deleted_at),
    token: {
      access,
      refresh,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
  };
}
