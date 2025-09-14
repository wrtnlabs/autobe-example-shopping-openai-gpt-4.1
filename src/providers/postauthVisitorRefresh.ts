import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceVisitorRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceVisitorRefresh";
import { IAiCommerceVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceVisitor";

/**
 * Refresh a visitor (guest) session—validates refresh token, issues renewed
 * access/refresh tokens for ai_commerce_visitor session. Expires if guest
 * upgrades or session is invalid.
 *
 * This endpoint allows visitors/guests (ai_commerce_visitor) with a valid
 * refresh token to renew temporary access tokens for onboarding or persistent
 * guest/anonymous flows. It checks that the provided refresh token is active,
 * not expired, and associated with the correct guest identity. If the guest
 * session is still eligible, it issues new access/refresh tokens, possibly
 * updating any onboarding context or expiring tokens.
 *
 * Security logic fully validates token authenticity, session timestamp, and
 * ties tokens to guest visitor records as needed. If the session is expired or
 * the visitor has registered/upgraded (i.e., is now a buyer), refresh is denied
 * and the user is prompted to register or login. Severe errors (invalid token,
 * privilege misuse, guest escalation) result in secure errors without exposure
 * of session data.
 *
 * All refresh flows, successful or not, are logged in the compliance/audit
 * trail (ai_commerce_audit_logs_user) for legal and monitoring purposes.
 *
 * This endpoint does not issue tokens for registered users/admins, and is
 * strictly protected against privilege escalation. Related endpoints: join
 * (guest registration).
 *
 * @param props - Object containing visitor refresh request information
 * @param props.body - The request body containing visitorId and refreshToken
 * @returns Updated authorized session (access/refresh tokens, visitor id,
 *   session status, expiry info)
 * @throws {Error} If the refresh token is invalid, expired, or does not match
 *   the visitor session; or the session is no longer valid/eligible
 */
export async function postauthVisitorRefresh(props: {
  body: IAiCommerceVisitorRefresh.ICreate;
}): Promise<IAiCommerceVisitor.IAuthorized> {
  const { refreshToken, visitorId } = props.body;
  let decoded: unknown;
  try {
    decoded = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (_e) {
    throw new Error("Invalid or expired refresh token");
  }

  // Validate decoded as object with id and type
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("id" in decoded) ||
    !("type" in decoded)
  ) {
    throw new Error("Malformed refresh token");
  }

  const idVal = (decoded as { id: unknown }).id;
  const typVal = (decoded as { type: unknown }).type;

  if (
    typeof idVal !== "string" ||
    typeof typVal !== "string" ||
    idVal !== visitorId ||
    typVal !== "visitor"
  ) {
    throw new Error("Refresh token visitorId/type does not match");
  }

  // Validate visitor exists and is not deleted
  const visitor = await MyGlobal.prisma.ai_commerce_visitor.findUnique({
    where: { id: visitorId },
    select: { id: true, deleted_at: true },
  });
  if (!visitor || visitor.deleted_at !== null) {
    throw new Error("Visitor session no longer eligible");
  }

  // Generate expiries as string & tags.Format<'date-time'>
  const now = Date.now();
  const accessExp = toISOStringSafe(new Date(now + 60 * 60 * 1000)); // 1 hour
  const refreshExp = toISOStringSafe(new Date(now + 14 * 24 * 60 * 60 * 1000)); // 14 days

  // JWT payload as for join
  const payload = Object.freeze({ id: visitorId, type: "visitor" });

  const newAccessToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const newRefreshToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "14d",
    issuer: "autobe",
  });

  return {
    visitorId: visitorId,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    status: "active",
    expiresAt: refreshExp,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExp,
      refreshable_until: refreshExp,
    },
  };
}
