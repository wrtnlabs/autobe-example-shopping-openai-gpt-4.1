import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";

/**
 * Authenticate seller, issuing new JWT tokens (ai_commerce_seller,
 * ai_commerce_buyer).
 *
 * This endpoint validates seller credentials and issues JWT access and refresh
 * tokens.
 *
 * - Only sellers linked to active buyers (not soft-deleted) and in 'active'
 *   status may login.
 * - Denies login for missing, deleted, or non-active accounts, or when password
 *   does not match.
 * - All error cases return the same message and do not expose internal state.
 * - JWT payload and expiry are strictly constructed without native Date.
 * - Returns IAiCommerceSeller.IAuthorized structure, including properly formatted
 *   expiration times.
 *
 * @param props - Object containing seller login credentials
 * @param props.body - Seller login body (email, password)
 * @returns Seller authorization structure including seller.id and issued JWT
 *   tokens
 * @throws {Error} If credentials are invalid or account is
 *   missing/deleted/non-active
 */
export async function postauthSellerLogin(props: {
  body: IAiCommerceSeller.ILogin;
}): Promise<IAiCommerceSeller.IAuthorized> {
  const { body } = props;
  // Forbid leaking any account info: always the same error
  const loginError = new Error("Invalid credentials");

  // 1. Find buyer by email (must not be soft-deleted)
  const buyer = await MyGlobal.prisma.ai_commerce_buyer.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });
  if (!buyer) throw loginError;

  // 2. Find seller link (must not be soft-deleted)
  const seller = await MyGlobal.prisma.ai_commerce_seller.findFirst({
    where: {
      buyer_id: buyer.id,
      deleted_at: null,
    },
  });
  if (!seller) throw loginError;

  // 3. Both buyer and seller must be 'active'
  if (buyer.status !== "active" || seller.status !== "active") throw loginError;

  // 4. Check password securely
  const passwordOk = await MyGlobal.password.verify(
    body.password,
    buyer.password_hash,
  );
  if (!passwordOk) throw loginError;

  // 5. Compute current time and expiry (no native Date, use number + branding)
  const nowEpoch = Date.now();
  const accessExpEpoch = nowEpoch + 60 * 60 * 1000; // 1 hour
  const refreshExpEpoch = nowEpoch + 7 * 24 * 60 * 60 * 1000; // 7 days
  const expired_at = toISOStringSafe(new Date(accessExpEpoch));
  const refreshable_until = toISOStringSafe(new Date(refreshExpEpoch));

  // 6. Prepare JWT payload (according to SellerPayload spec)
  const payload = {
    id: seller.id,
    type: "seller",
  };

  // 7. Sign access/refresh tokens with issuer 'autobe' and correct expiry
  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: 60 * 60, // in seconds (1 hour)
    issuer: "autobe",
  }) as string;
  const refresh = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: 7 * 24 * 60 * 60, // in seconds (7 days)
    issuer: "autobe",
  }) as string;

  return {
    id: seller.id,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
  };
}
