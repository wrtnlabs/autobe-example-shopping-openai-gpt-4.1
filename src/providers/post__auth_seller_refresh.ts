import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Renew JWT tokens for an active seller session
 * (shopping_mall_ai_backend_sellers)
 *
 * Provides JWT access and refresh token renewal for sellers, backed by the
 * 'shopping_mall_ai_backend_sellers' table and session state management.
 * Requires a valid refresh token from a previous successful login. Renewed
 * tokens extend session validity for the active seller. Security validation
 * includes token existence, expiration, and seller account state (is_active).
 * This endpoint does NOT update last_login_at (field does not exist in the
 * schema); only updated_at will be touched (auto-managed by Prisma). Supports
 * secure API and dashboard operation for active sellers.
 *
 * @param props - Request properties
 * @param props.body.refresh_token - Seller's JWT refresh token for session
 *   renewal.
 * @returns New access and refresh tokens for the seller, with profile
 *   information.
 * @throws {Error} If the refresh token is invalid/expired, or the seller is not
 *   found or inactive.
 */
export async function post__auth_seller_refresh(props: {
  body: IShoppingMallAiBackendSeller.IRefresh;
}): Promise<IShoppingMallAiBackendSeller.IAuthorized> {
  const { refresh_token } = props.body;
  // Step 1: Validate and decode the refresh token
  let payload: { id: string; type: string };
  try {
    payload = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string; type: string };
  } catch {
    throw new Error("Invalid or expired refresh token");
  }
  // Step 2: Ensure this is a seller token
  if (payload.type !== "seller")
    throw new Error("Token does not correspond to a seller");
  // Step 3: Look up the seller (must be active and not deleted)
  const seller =
    await MyGlobal.prisma.shopping_mall_ai_backend_sellers.findFirst({
      where: {
        id: payload.id,
        is_active: true,
        deleted_at: null,
      },
    });
  if (!seller) throw new Error("Seller not found or inactive");
  // Step 4: Issue new JWTs (same structure as login/join)
  const now = Date.now();
  const accessExp = new Date(now + 60 * 60 * 1000); // 1 hour
  const refreshExp = new Date(now + 7 * 24 * 60 * 60 * 1000); // 7 days
  const token = {
    access: jwt.sign(
      { id: seller.id, type: "seller" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      { id: seller.id, type: "seller" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExp),
    refreshable_until: toISOStringSafe(refreshExp),
  } satisfies IAuthorizationToken;
  // Step 5: Return tokens and seller profile
  return {
    token,
    seller: {
      id: seller.id,
      email: seller.email,
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
