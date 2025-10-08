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
  const now = toISOStringSafe(new Date());
  const { body } = props;

  // Duplicate email check
  const emailExists = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { email: body.email },
  });
  if (emailExists) throw new HttpException("이미 등록된 이메일입니다.", 409);

  // Duplicate registration number check
  const regNumExists = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { business_registration_number: body.business_registration_number },
  });
  if (regNumExists)
    throw new HttpException("이미 등록된 사업자 등록번호입니다.", 409);

  // Hash password
  const password_hash = await PasswordUtil.hash(body.password);

  // Create seller row
  const sellerId = v4();
  const createData = {
    id: sellerId,
    email: body.email,
    password_hash,
    business_name: body.business_name,
    contact_name: body.contact_name,
    phone: body.phone,
    kyc_document_uri: body.kyc_document_uri ?? null,
    approval_status: "pending",
    business_registration_number: body.business_registration_number,
    email_verified: false,
    created_at: now,
    updated_at: now,
  };
  const seller = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: createData,
  });

  // Generate tokens
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

  // Token expiry calculation
  const expired_at = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Create email verification record (valid 24h)
  await MyGlobal.prisma.shopping_mall_email_verifications.create({
    data: {
      id: v4(),
      user_id: seller.id,
      email: seller.email,
      token: v4(),
      expires_at: toISOStringSafe(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      created_at: now,
    },
  });

  // Return authorized seller
  return {
    id: seller.id,
    email: seller.email,
    business_name: seller.business_name,
    contact_name: seller.contact_name,
    phone: seller.phone,
    kyc_document_uri: seller.kyc_document_uri ?? null,
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
      expired_at,
      refreshable_until,
    },
  };
}
