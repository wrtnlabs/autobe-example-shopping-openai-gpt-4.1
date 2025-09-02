import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Performs credential-based authentication for sellers using the
 * 'shopping_mall_ai_backend_sellers' table.
 *
 * Allows sellers previously registered to log in using their business email and
 * password. On successful authentication, issues JWT access and refresh tokens.
 * Denies authentication for inactive or unverified accounts. Intended for
 * session creation and ongoing seller API use. Security logging is enforced for
 * compliance/audit (failed and successful attempts).
 *
 * @param props - Request body containing seller's email and password
 * @returns {IShoppingMallAiBackendSeller.IAuthorized} Authorized payload with
 *   JWT tokens and seller profile
 * @throws {Error} When credentials are invalid, account is inactive, or not
 *   verified
 */
export async function post__auth_seller_login(props: {
  body: IShoppingMallAiBackendSeller.ILogin;
}): Promise<IShoppingMallAiBackendSeller.IAuthorized> {
  const { email, password } = props.body;

  // 1. Attempt to fetch the seller by email
  const seller =
    await MyGlobal.prisma.shopping_mall_ai_backend_sellers.findUnique({
      where: { email },
    });
  if (!seller || !seller.is_active || !seller.is_verified) {
    // SECURITY: Log failed login attempt for compliance
    await MyGlobal.logs?.create?.({
      type: "seller_login_failed",
      actor_id: null,
      message: `Seller login failed for email: ${email}`,
      meta: JSON.stringify({ status: "account not found/ineligible" }),
    });
    throw new Error("Invalid credentials");
  }

  // 2. Password check (always done after eligibility checks for security/side channel resistance)
  const valid = await MyGlobal.password.verify(password, seller.password_hash);
  if (!valid) {
    await MyGlobal.logs?.create?.({
      type: "seller_login_failed",
      actor_id: seller.id,
      message: `Seller login failed for email: ${email} (wrong password)`,
      meta: JSON.stringify({ status: "bad password" }),
    });
    throw new Error("Invalid credentials");
  }

  // [SECURITY LOGGING] Log successful logins (audit trail)
  await MyGlobal.logs?.create?.({
    type: "seller_login_success",
    actor_id: seller.id,
    message: `Seller login successful for email: ${email}`,
    meta: JSON.stringify({ status: "ok" }),
  });

  // 3. Generate token timestamps - always as ISO string using toISOStringSafe()
  const now = Date.now();
  const accessExp = toISOStringSafe(new Date(now + 3600_000)); // 1 hour ahead
  const refreshExp = toISOStringSafe(new Date(now + 7 * 24 * 3600_000)); // 7 days ahead
  // JWT payload: always use exact payload structure
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

  return {
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExp,
      refreshable_until: refreshExp,
    },
    seller: {
      id: seller.id as string & tags.Format<"uuid">,
      email: seller.email as string & tags.Format<"email">,
      business_registration_number: seller.business_registration_number,
      name: seller.name,
      is_active: seller.is_active,
      is_verified: seller.is_verified,
      created_at: toISOStringSafe(seller.created_at),
      updated_at: toISOStringSafe(seller.updated_at),
      deleted_at: seller.deleted_at ? toISOStringSafe(seller.deleted_at) : null,
    },
  };
}
