import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";
import { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";

/**
 * Refresh buyer session tokens using a valid refresh token.
 *
 * This endpoint allows an authenticated buyer to extend their session by
 * refreshing their JWT access and refresh tokens, provided the submitted
 * refresh token is valid, corresponds to an existing, non-expired session in
 * the database, and the buyer account is still active. The session and buyer
 * are both validated for non-soft-deleted status and session expiry. A new
 * access token and refresh token are generated and returned, with audit logging
 * performed for compliance.
 *
 * @param props - Parameters object containing the refresh token in
 *   props.body.refreshToken
 * @returns IAiCommerceBuyer.IAuthorized object with new token set and basic
 *   buyer context
 * @throws {Error} If the refresh token is invalid, the session has expired, or
 *   the buyer does not exist
 */
export async function postauthBuyerRefresh(props: {
  body: IBuyer.IRefresh;
}): Promise<IAiCommerceBuyer.IAuthorized> {
  const { body } = props;
  let decoded: unknown;
  try {
    decoded = jwt.verify(body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new Error("Invalid refresh token");
  }
  if (!decoded || typeof decoded !== "object" || decoded === null) {
    throw new Error("Malformed refresh token");
  }
  // Expect decoded to have session_id and buyer_id
  const session_id = (decoded as Record<string, unknown>).session_id;
  const buyer_id = (decoded as Record<string, unknown>).buyer_id;
  if (typeof session_id !== "string" || typeof buyer_id !== "string") {
    throw new Error("Malformed refresh token payload");
  }
  // Check session
  const session =
    await MyGlobal.prisma.ai_commerce_user_authentications.findUnique({
      where: { id: session_id },
      select: { session_expires_at: true, deleted_at: true, buyer_id: true },
    });
  if (!session || !session.buyer_id || session.deleted_at !== null) {
    throw new Error("Session not found or revoked");
  }
  const nowString = toISOStringSafe(new Date());
  if (toISOStringSafe(session.session_expires_at) <= nowString) {
    throw new Error("Session expired");
  }
  // Fetch buyer
  const buyer = await MyGlobal.prisma.ai_commerce_buyer.findUnique({
    where: { id: session.buyer_id },
    select: { id: true, email: true, deleted_at: true },
  });
  if (!buyer || buyer.deleted_at !== null) {
    throw new Error("Buyer not found");
  }
  // Issue new access and refresh tokens
  const accessPayload = { id: buyer.id, type: "buyer" };
  const accessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshPayload = {
    session_id,
    buyer_id: buyer.id,
    type: "refresh",
    sub: buyer.id,
  };
  const refreshToken = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  // Calculate expiry times strictly as string & tags.Format<'date-time'>
  const expired_at = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // Audit log
  await MyGlobal.prisma.ai_commerce_audit_logs_user.create({
    data: {
      id: v4(),
      buyer_id: buyer.id,
      action_type: "token_refresh",
      subject_type: "buyer",
      subject_id: buyer.id,
      created_at: toISOStringSafe(new Date()),
    },
  });
  // Build response
  return {
    id: buyer.id,
    email: buyer.email,
    role: "buyer",
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at,
      refreshable_until,
    },
    buyer: { id: buyer.id, email: buyer.email, role: "buyer" },
  };
}
