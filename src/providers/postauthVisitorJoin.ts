import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceVisitorJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceVisitorJoin";
import { IAiCommerceVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceVisitor";

/**
 * Register a new member from guest (visitor).
 *
 * This endpoint creates a new member (ai_commerce_buyer) account, requiring a
 * unique email, a compliant password, and explicit consent to privacy and
 * onboarding terms. It validates for duplicates, enforces password policy, and
 * issues JWT tokens (access and refresh) after success for onboarding and login
 * flows. Only guests (no authentication) may register. Designed for onboarding
 * and session bridging (trackingId), but analytics/merging with
 * ai_commerce_visitor is not performed here directly.
 *
 * @param props.body - Guest registration data, including email, password,
 *   consent, and optional trackingId (for analytics/session merge).
 * @returns IAiCommerceVisitor.IAuthorized result — issued tokens, user status,
 *   and session context.
 * @throws {Error} If registration violates unique email constraint, password
 *   policy, or lacks consent.
 */
export async function postauthVisitorJoin(props: {
  body: IAiCommerceVisitorJoin.ICreate;
}): Promise<IAiCommerceVisitor.IAuthorized> {
  const { body } = props;

  // 1. Consent validation (privacy, terms). Required by law/business rules.
  if (!body.consent) {
    throw new Error(
      "ConsentRequired: Consent to terms and privacy policy is mandatory.",
    );
  }

  // 2. Password policy enforcement (minimum 8 chars, at least a-z, A-Z, 0-9)
  if (
    typeof body.password !== "string" ||
    body.password.length < 8 ||
    !/[a-z]/.test(body.password) ||
    !/[A-Z]/.test(body.password) ||
    !/[0-9]/.test(body.password)
  ) {
    throw new Error(
      "PasswordWeak: Password does not meet minimum complexity requirements.",
    );
  }

  // 3. Duplicate email check
  const existingBuyer = await MyGlobal.prisma.ai_commerce_buyer.findUnique({
    where: { email: body.email },
    select: { id: true },
  });
  if (existingBuyer) {
    throw new Error("EmailExists: An account with this email already exists.");
  }

  // 4. Hash password
  const password_hash = await MyGlobal.password.hash(body.password);

  // 5. Prepare new account data
  const now = toISOStringSafe(new Date());
  const buyerId = v4();
  const status = "active"; // Default initial status

  await MyGlobal.prisma.ai_commerce_buyer.create({
    data: {
      id: buyerId,
      email: body.email,
      password_hash,
      status,
      created_at: now,
      updated_at: now,
    },
  });

  // 6. Token and expiry calculation (access: 1h, refresh: 7d)
  const expiresAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // 7. JWT token generation (BuyerPayload structure)
  const accessToken = jwt.sign(
    {
      id: buyerId,
      type: "buyer",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: buyerId,
      type: "buyer",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // 8. Return exactly the IAiCommerceVisitor.IAuthorized structure
  return {
    visitorId: buyerId,
    accessToken: accessToken,
    refreshToken: refreshToken,
    status: status,
    expiresAt: expiresAt,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiresAt,
      refreshable_until: refreshableUntil,
    },
  };
}
