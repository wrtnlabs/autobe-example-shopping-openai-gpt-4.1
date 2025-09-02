import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Register a new seller and issue JWT tokens (shopping_mall_ai_backend_sellers)
 *
 * Provides seller account registration and initial JWT authentication for the
 * ShoppingMallAiBackend platform. Utilizes 'shopping_mall_ai_backend_sellers'
 * table for business seller access. Ensures new seller mandates valid business
 * email and registration number, with seller onboarding and is_verified flag
 * support. Registers seller via POST, returning access and refresh tokens. No
 * password, OTP, or extra verification required at registration. Used for
 * onboarding new merchants; repeatable only for unregistered businesses.
 * Requires is_active, is_verified, and unique email fields as per schema.
 *
 * @param props - Request properties
 * @param props.body - Information required to register a new seller business
 *   account.
 * @returns Authorized payload including access and refresh tokens for the new
 *   seller.
 * @throws {Error} If a seller already exists with the given email or business
 *   registration number.
 */
export async function post__auth_seller_join(props: {
  body: IShoppingMallAiBackendSeller.ICreate;
}): Promise<IShoppingMallAiBackendSeller.IAuthorized> {
  const { body } = props;
  // Check for duplicate email or business registration number
  const exists =
    await MyGlobal.prisma.shopping_mall_ai_backend_sellers.findFirst({
      where: {
        OR: [
          { email: body.email },
          { business_registration_number: body.business_registration_number },
        ],
      },
      select: { id: true },
    });
  if (exists) {
    throw new Error("Email or business registration number already exists");
  }

  // Prepare values for creation
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const sellerId: string & tags.Format<"uuid"> = v4();

  // Create seller record
  const sellerRow =
    await MyGlobal.prisma.shopping_mall_ai_backend_sellers.create({
      data: {
        id: sellerId,
        email: body.email,
        business_registration_number: body.business_registration_number,
        name: body.name,
        is_active: true,
        is_verified: true,
        created_at: now,
        updated_at: now,
      },
    });

  // Compute token expiration datetimes
  const accessExpiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Generate JWT tokens
  const access: string = jwt.sign(
    { id: sellerRow.id, type: "seller" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh: string = jwt.sign(
    { id: sellerRow.id, type: "seller" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Compose the response per IShoppingMallAiBackendSeller.IAuthorized structure
  return {
    token: {
      access,
      refresh,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
    seller: {
      id: sellerRow.id,
      email: sellerRow.email,
      business_registration_number: sellerRow.business_registration_number,
      name: sellerRow.name,
      is_active: sellerRow.is_active,
      is_verified: sellerRow.is_verified,
      created_at: toISOStringSafe(sellerRow.created_at),
      updated_at: toISOStringSafe(sellerRow.updated_at),
      deleted_at: sellerRow.deleted_at
        ? toISOStringSafe(sellerRow.deleted_at)
        : null,
    },
  };
}
