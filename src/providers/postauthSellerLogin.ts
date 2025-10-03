import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthSellerLogin(props: {
  body: IShoppingMallSeller.ILogin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const { email, password, shopping_mall_channel_id } = props.body;

  // Find matching customer: email, channel, not deleted
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      email,
      shopping_mall_channel_id,
      deleted_at: null,
    },
  });
  if (!customer) {
    throw new HttpException("Invalid email or password", 401);
  }
  // Find linked seller, not soft deleted
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
  });
  if (!seller) {
    throw new HttpException("Invalid email or password", 401);
  }
  // Only allow login if both seller and customer status are 'active'
  if (seller.status !== "active" || customer.status !== "active") {
    throw new HttpException("Seller account is not active", 401);
  }
  // password_hash presence
  if (!customer.password_hash) {
    throw new HttpException("Invalid email or password", 401);
  }
  // Password check
  const verified = await PasswordUtil.verify(password, customer.password_hash);
  if (!verified) {
    throw new HttpException("Invalid email or password", 401);
  }
  // Generate tokens
  const accessExpire = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      id: seller.id,
      type: "seller",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      id: seller.id,
      type: "seller",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // ISO strings for expiration
  const accessExpiredAt = toISOStringSafe(accessExpire);
  const refreshExpiredAt = toISOStringSafe(refreshExpire);

  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiredAt,
    refreshable_until: refreshExpiredAt,
  };

  return {
    id: seller.id,
    shopping_mall_customer_id: seller.shopping_mall_customer_id,
    shopping_mall_section_id: seller.shopping_mall_section_id,
    profile_name: seller.profile_name,
    status: seller.status,
    approval_at: seller.approval_at
      ? toISOStringSafe(seller.approval_at)
      : undefined,
    kyc_status: seller.kyc_status,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: seller.deleted_at
      ? toISOStringSafe(seller.deleted_at)
      : undefined,
    token,
    seller: {
      id: seller.id,
      shopping_mall_section_id: seller.shopping_mall_section_id,
      profile_name: seller.profile_name,
      status: seller.status,
      approval_at: seller.approval_at
        ? toISOStringSafe(seller.approval_at)
        : undefined,
      kyc_status: seller.kyc_status,
      created_at: toISOStringSafe(seller.created_at),
      updated_at: toISOStringSafe(seller.updated_at),
      deleted_at: seller.deleted_at
        ? toISOStringSafe(seller.deleted_at)
        : undefined,
    },
  };
}
