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
  const { refresh_token } = props.body;

  // 1. Find the session by refresh_token
  const session = await MyGlobal.prisma.shopping_mall_user_sessions.findUnique({
    where: { refresh_token },
  });
  if (!session || session.revoked_at !== null) {
    throw new HttpException("인증 실패: 잘못된 리프레시 토큰입니다.", 401);
  }

  // 2. Check refresh token expiry
  const now = new Date();
  if (session.expires_at <= now) {
    throw new HttpException("인증 실패: 리프레시 토큰이 만료되었습니다.", 401);
  }
  const nowStr = toISOStringSafe(now) as string & tags.Format<"date-time">;

  // 3. Find the seller and validate status
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: session.user_id },
  });
  if (
    !seller ||
    seller.deleted_at !== null ||
    seller.approval_status !== "approved" ||
    seller.email_verified !== true
  ) {
    throw new HttpException(
      "인증 실패: 판매자 계정이 유효하지 않거나 활성화되지 않았습니다.",
      401,
    );
  }

  // 4. Rotate new tokens
  const accessExpireSec = 60 * 60; // 1 hour
  const refreshExpireSec = 60 * 60 * 24 * 7; // 7 days
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + accessExpireSec * 1000),
  ) as string & tags.Format<"date-time">;
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + refreshExpireSec * 1000),
  ) as string & tags.Format<"date-time">;
  const accessToken = jwt.sign(
    { id: seller.id, type: "seller" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: accessExpireSec, issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    { id: seller.id, type: "seller" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: refreshExpireSec, issuer: "autobe" },
  );

  // 5. Update session details
  await MyGlobal.prisma.shopping_mall_user_sessions.update({
    where: { id: session.id },
    data: {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expires_at: refreshExpiresAt,
      revoked_at: null,
    },
  });

  // 6. Return seller DTO with strict types
  return {
    id: seller.id,
    email: seller.email,
    business_name: seller.business_name,
    contact_name: seller.contact_name,
    phone: seller.phone,
    ...(seller.kyc_document_uri != null && {
      kyc_document_uri: seller.kyc_document_uri,
    }),
    approval_status: seller.approval_status,
    business_registration_number: seller.business_registration_number,
    email_verified: seller.email_verified,
    created_at: toISOStringSafe(seller.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(seller.updated_at) as string &
      tags.Format<"date-time">,
    ...(seller.deleted_at != null && {
      deleted_at: toISOStringSafe(seller.deleted_at) as string &
        tags.Format<"date-time">,
    }),
    token: {
      access: accessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
