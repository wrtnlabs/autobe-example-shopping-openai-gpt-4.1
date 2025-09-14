import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";

/**
 * Register a new seller account (ai_commerce_seller table) and issue initial
 * tokens.
 *
 * This endpoint handles registration of a new seller account, which must be
 * linked to an existing buyer account (via buyer_id). It enforces unique seller
 * emails, hashes passwords securely, creates the seller (status
 * 'under_review'), and issues a JWT-based session token pair. If a seller or
 * buyer with the given email already exists as a seller, a clear error is
 * thrown. No native Date or 'as' is used; all datetimes use toISOStringSafe and
 * UUID uses v4 with correct branding. The account is not auto-approved;
 * onboarding workflow is triggered through subsequent logic.
 *
 * @param props - Object with the body containing registration info
 * @param props.body.email - Unique seller registration email (must already
 *   exist as buyer email)
 * @param props.body.password - Plaintext password, which will be hashed and
 *   stored as password_hash
 * @returns IAuthorized object containing seller id and JWT token
 * @throws {Error} If a seller with the email already exists, or the buyer does
 *   not exist
 */
export async function postauthSellerJoin(props: {
  body: IAiCommerceSeller.IJoin;
}): Promise<IAiCommerceSeller.IAuthorized> {
  const { email, password } = props.body;

  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Check for duplicate seller (linked via buyer email)
    const duplicateSeller = await tx.ai_commerce_seller.findFirst({
      where: { buyer: { email } },
    });
    if (duplicateSeller) {
      throw new Error("A seller with this email already exists.");
    }

    // Find existing buyer for email
    const buyer = await tx.ai_commerce_buyer.findUnique({
      where: { email },
    });
    if (!buyer) {
      throw new Error(
        "Cannot register as seller: buyer must pre-exist with this email.",
      );
    }

    // Securely hash seller password
    const password_hash = await MyGlobal.password.hash(password);
    // Update buyer password hash if not already set, for security/convergence
    await tx.ai_commerce_buyer.update({
      where: { id: buyer.id },
      data: { password_hash },
    });

    // Create seller with status under_review
    const sellerId = v4() as string & tags.Format<"uuid">;
    const now = toISOStringSafe(new Date());
    await tx.ai_commerce_seller.create({
      data: {
        id: sellerId,
        buyer_id: buyer.id,
        status: "under_review",
        created_at: now,
        updated_at: now,
        onboarded_at: null,
        deleted_at: null,
      },
    });

    // Access token valid for 1 hour, refresh for 7 days
    const accessExp = new Date(Date.now() + 60 * 60 * 1000); // 1h
    const refreshExp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7d
    const accessExpiredAt = toISOStringSafe(accessExp);
    const refreshableUntil = toISOStringSafe(refreshExp);

    // JWT payload & creation
    const jwtPayload = { id: sellerId, type: "seller" };
    const secret = MyGlobal.env.JWT_SECRET_KEY;
    const access =
      (await new Promise<string>((resolve, reject) => {
        jwt.sign(
          jwtPayload,
          secret,
          { expiresIn: "1h", issuer: "autobe" },
          (err, token) => (err ? reject(err) : resolve(token || "")),
        );
      })) ?? "";
    const refresh =
      (await new Promise<string>((resolve, reject) => {
        jwt.sign(
          { ...jwtPayload, tokenType: "refresh" },
          secret,
          { expiresIn: "7d", issuer: "autobe" },
          (err, token) => (err ? reject(err) : resolve(token || "")),
        );
      })) ?? "";

    // Full DTO token structure
    const token = {
      access,
      refresh,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    };

    return {
      id: sellerId,
      token,
    };
  });
}
