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

  // 1. Find session with matching refresh_token
  const session = await MyGlobal.prisma.shopping_mall_user_sessions.findUnique({
    where: { refresh_token },
  });
  if (!session) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // 2. Check for session expiration and revocation
  const now = new Date();
  if (session.expires_at < now || session.revoked_at !== null) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // 3. Retrieve the customer and check status
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: session.user_id },
  });
  if (!customer) {
    throw new HttpException("Associated customer not found", 403);
  }
  if (customer.deleted_at !== null) {
    throw new HttpException("Customer account deleted", 403);
  }
  if (
    customer.status !== "active" &&
    customer.status !== "pending_verification"
  ) {
    throw new HttpException(
      "Customer account is not active or pending verification",
      403,
    );
  }

  // 4. Generate new tokens (JWT)
  const jwtPayload = {
    id: customer.id,
    type: "customer",
  };
  const expiresInSeconds = 60 * 60; // 1 hour
  const refreshExpiresInSeconds = 7 * 24 * 60 * 60; // 7 days
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  const refreshExpiresAt = new Date(
    Date.now() + refreshExpiresInSeconds * 1000,
  );

  const newAccessToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: expiresInSeconds,
    issuer: "autobe",
  });
  const newRefreshToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: refreshExpiresInSeconds,
    issuer: "autobe",
  });

  // 5. Update session with new tokens
  await MyGlobal.prisma.shopping_mall_user_sessions.update({
    where: { id: session.id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_at: expiresAt,
      revoked_at: null,
    },
  });

  // 6. Return the full authorized DTO
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
      customer.deleted_at !== null
        ? toISOStringSafe(customer.deleted_at)
        : null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(expiresAt),
      refreshable_until: toISOStringSafe(refreshExpiresAt),
    },
  };
}
