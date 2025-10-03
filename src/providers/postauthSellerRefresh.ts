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

export async function postAuthSellerRefresh(props: {
  body: IShoppingMallSeller.IRefresh;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const { body } = props;

  // 1. Decode and verify refresh token
  let decoded: any;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (err) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // 2. Determine seller id (payload must have type "seller" and id)
  if (!decoded || decoded.type !== "seller" || !decoded.id) {
    throw new HttpException("Invalid refresh token payload for seller", 401);
  }
  const sellerId = decoded.id;

  // 3. Fetch seller by id, include customer (for customer check)
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: sellerId },
    include: { customer: true },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }
  // Domain checks for soft-deletion and status - seller
  if (seller.deleted_at !== null) {
    throw new HttpException("Seller account deleted", 403);
  }
  if (seller.status !== "active") {
    throw new HttpException("Seller account is not active", 403);
  }
  // Domain checks for customer
  if (!seller.customer || seller.customer.deleted_at !== null) {
    throw new HttpException("Customer account deleted", 403);
  }
  if (seller.customer.status !== "active") {
    throw new HttpException("Customer account is not active", 403);
  }

  // 4. Generate new tokens (expire: 1h for access, 7d for refresh)
  const nowMillis = Date.now();
  const accessExpiresAt = new Date(nowMillis + 60 * 60 * 1000);
  const refreshExpiresAt = new Date(nowMillis + 7 * 24 * 60 * 60 * 1000);

  const payload = { id: seller.id, type: "seller" };
  const accessToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  // 5. Compose API tokens and auth object (all ISO string, no Date type)
  const result: IShoppingMallSeller.IAuthorized = {
    id: seller.id,
    shopping_mall_customer_id: seller.shopping_mall_customer_id,
    shopping_mall_section_id: seller.shopping_mall_section_id,
    profile_name: seller.profile_name,
    status: seller.status,
    approval_at: seller.approval_at
      ? toISOStringSafe(seller.approval_at)
      : null,
    kyc_status: seller.kyc_status,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: seller.deleted_at ? toISOStringSafe(seller.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpiresAt),
      refreshable_until: toISOStringSafe(refreshExpiresAt),
    },
    seller: {
      id: seller.id,
      shopping_mall_section_id: seller.shopping_mall_section_id,
      profile_name: seller.profile_name,
      status: seller.status,
      approval_at: seller.approval_at
        ? toISOStringSafe(seller.approval_at)
        : null,
      kyc_status: seller.kyc_status,
      created_at: toISOStringSafe(seller.created_at),
      updated_at: toISOStringSafe(seller.updated_at),
      deleted_at: seller.deleted_at ? toISOStringSafe(seller.deleted_at) : null,
    },
  };
  return result;
}
