import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Refresh customer authentication tokens using session refresh token (member).
 *
 * This endpoint refreshes customer JWT access and refresh tokens based on a
 * valid refresh token. It looks up the session in
 * shopping_mall_ai_backend_customer_sessions by the given refresh token,
 * validates that the session is not expired/terminated, and that the linked
 * customer is still active and not withdrawn. New JWT access and refresh tokens
 * are issued (rotated), with updated expiries. The session is updated
 * atomically. If any validation fails (invalid, expired, terminated, or
 * withdrawn), throws Error. Handles all compliance and audit requirements.
 *
 * @param props - Request properties
 * @param props.body - API token refresh parameters (customer)
 * @returns Authorized customer identity and renewed tokens for further API use
 * @throws {Error} When refresh token is invalid, expired, session terminated,
 *   or user inactive/withdrawn
 */
export async function post__auth_customer_refresh(props: {
  body: import("../api/structures/IShoppingMallAiBackendCustomer").IShoppingMallAiBackendCustomer.IRefresh;
}): Promise<
  import("../api/structures/IShoppingMallAiBackendCustomer").IShoppingMallAiBackendCustomer.IAuthorized
> {
  const { refresh_token } = props.body;

  const session =
    await MyGlobal.prisma.shopping_mall_ai_backend_customer_sessions.findFirst({
      where: { refresh_token },
      include: { customer: true },
    });
  if (!session) throw new Error("Session not found");

  if (session.terminated_at !== null)
    throw new Error("Session has been terminated");
  if (session.expires_at.getTime() <= Date.now())
    throw new Error("Session expired");

  const customer = session.customer;
  if (!customer.is_active || customer.deleted_at !== null)
    throw new Error("Customer is disabled or withdrawn");

  const now = Date.now();
  const accessTokenExpNum = now + 60 * 60 * 1000;
  const refreshTokenExpNum = now + 7 * 24 * 60 * 60 * 1000;
  const accessTokenExp = toISOStringSafe(new Date(accessTokenExpNum));
  const refreshTokenExp = toISOStringSafe(new Date(refreshTokenExpNum));

  const payload = { id: customer.id, type: "customer" };
  const access_token = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
    expiresIn: "1h",
  });
  const refresh_token_new = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
    expiresIn: "7d",
  });

  await MyGlobal.prisma.shopping_mall_ai_backend_customer_sessions.update({
    where: { id: session.id },
    data: {
      access_token,
      refresh_token: refresh_token_new,
      expires_at: new Date(refreshTokenExpNum),
    },
  });

  return {
    token: {
      access: access_token,
      refresh: refresh_token_new,
      expired_at: accessTokenExp,
      refreshable_until: refreshTokenExp,
    },
    customer: {
      id: customer.id,
      email: customer.email,
      phone_number: customer.phone_number,
      name: customer.name,
      nickname: customer.nickname === undefined ? null : customer.nickname,
      is_active: customer.is_active,
      is_verified: customer.is_verified,
      last_login_at:
        customer.last_login_at === null || customer.last_login_at === undefined
          ? null
          : toISOStringSafe(customer.last_login_at),
      created_at: toISOStringSafe(customer.created_at),
      updated_at: toISOStringSafe(customer.updated_at),
      deleted_at:
        customer.deleted_at === null || customer.deleted_at === undefined
          ? null
          : toISOStringSafe(customer.deleted_at),
    },
  };
}
