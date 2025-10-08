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
  const nowStr = toISOStringSafe(new Date());
  // 1. Lookup seller by email and not deleted
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (!seller) throw new HttpException("Invalid credentials.", 401);
  // 2. Verify bcrypt hash of password
  const verified = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!verified) throw new HttpException("Invalid credentials.", 401);
  // 3. Enforce status rules
  if (seller.approval_status !== "approved")
    throw new HttpException("Account is not approved.", 403);
  if (!seller.email_verified)
    throw new HttpException("Email not verified.", 403);
  // 4. Generate tokens and session
  const accessExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    { id: seller.id, type: "seller" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    { id: seller.id, type: "seller", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Write session log
  await MyGlobal.prisma.shopping_mall_user_sessions.create({
    data: {
      id: v4(),
      user_id: seller.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: toISOStringSafe(accessExpiresAt),
      created_at: nowStr,
    },
  });
  // Compose result strictly following DTO
  return {
    id: seller.id,
    email: seller.email,
    business_name: seller.business_name,
    contact_name: seller.contact_name,
    phone: seller.phone,
    kyc_document_uri: seller.kyc_document_uri ?? undefined,
    approval_status: seller.approval_status,
    business_registration_number: seller.business_registration_number,
    email_verified: seller.email_verified,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: seller.deleted_at
      ? toISOStringSafe(seller.deleted_at)
      : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpiresAt),
      refreshable_until: toISOStringSafe(refreshExpiresAt),
    },
  };
}
