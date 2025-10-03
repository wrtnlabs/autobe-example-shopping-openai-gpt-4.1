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

export async function postAuthSellerJoin(props: {
  body: IShoppingMallSeller.IJoin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const { body } = props;
  // 1. Ensure email uniqueness within the channel
  const existing = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      shopping_mall_channel_id: body.shopping_mall_channel_id,
      email: body.email,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existing) {
    throw new HttpException("Email already registered in this channel.", 409);
  }

  // 2. Password must be present and hashed
  if (!body.password) {
    throw new HttpException("Password is required for registration.", 400);
  }
  const passwordHash = await PasswordUtil.hash(body.password);

  // 3. Timestamps and IDs
  const now = toISOStringSafe(new Date());
  const customerId = v4();
  const sellerId = v4();

  // 4. Create customer record
  await MyGlobal.prisma.shopping_mall_customers.create({
    data: {
      id: customerId,
      shopping_mall_channel_id: body.shopping_mall_channel_id,
      email: body.email,
      password_hash: passwordHash,
      phone: body.phone ?? null,
      name: body.name,
      status: "pending",
      kyc_status: body.kyc_status ?? "pending",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 5. Create seller record
  const seller = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: sellerId,
      shopping_mall_customer_id: customerId,
      shopping_mall_section_id: body.shopping_mall_section_id,
      profile_name: body.profile_name,
      status: "pending",
      approval_at: null,
      kyc_status: body.kyc_status ?? "pending",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 6. JWT tokens and expiration timestamps
  const expiresAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const payload = {
    id: seller.id,
    type: "seller",
  };
  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: expiresAt,
    refreshable_until: refreshableUntil,
  };

  const summary: IShoppingMallSeller.ISummary = {
    id: seller.id,
    shopping_mall_section_id: seller.shopping_mall_section_id,
    profile_name: seller.profile_name,
    status: seller.status,
    approval_at: null,
    kyc_status: seller.kyc_status,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: null,
  };

  return {
    id: seller.id,
    shopping_mall_customer_id: seller.shopping_mall_customer_id,
    shopping_mall_section_id: seller.shopping_mall_section_id,
    profile_name: seller.profile_name,
    status: seller.status,
    approval_at: null,
    kyc_status: seller.kyc_status,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: null,
    token,
    seller: summary,
  };
}
