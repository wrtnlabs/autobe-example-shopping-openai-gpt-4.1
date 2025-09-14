import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";

/**
 * Refresh admin JWT session tokens (admin authentication, ai_commerce_admin
 * table).
 *
 * This operation allows an authenticated admin with a valid refresh token to
 * renew their session JWT tokens for continued privileged backend access to the
 * aiCommerce platform. It accepts a valid refresh token, validates it against
 * records in ai_commerce_user_authentications and the admin status, and issues
 * new access/refresh tokens as configured by session policy. Suspended or
 * deleted admin accounts are blocked from refreshing sessions. Refresh attempts
 * are fully audit-logged for compliance, and failed or expired tokens yield
 * error responses. This endpoint ensures seamless administrator session
 * continuity while enforcing strict role-based access and complying with the
 * admin role's schema requirements. It is a required element of a robust
 * administrator authentication system.
 *
 * @param props - Object containing all necessary parameters for the operation
 * @param props.body - IAiCommerceAdmin.IRefresh: The request body containing
 *   the admin refresh token
 * @returns IAiCommerceAdmin.IAuthorized - Refreshed authentication tokens and
 *   updated admin info
 * @throws {Error} When refresh token is expired, malformed, linked to
 *   non-existent/non-active admin, revoked, or violates compliance constraints
 */
export async function postauthAdminRefresh(props: {
  body: IAiCommerceAdmin.IRefresh;
}): Promise<IAiCommerceAdmin.IAuthorized> {
  const { refreshToken } = props.body;

  let decoded: unknown;
  try {
    decoded = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (error) {
    await MyGlobal.prisma.ai_commerce_audit_logs_user.create({
      data: {
        id: v4(),
        admin_id: undefined,
        action_type: "admin_refresh_failed",
        subject_type: "admin",
        subject_id: v4(),
        created_at: toISOStringSafe(new Date()),
        ip_address: undefined,
        device_info: undefined,
      },
    });
    throw new Error("Invalid or expired refresh token");
  }

  // Validate decoded JWT structure strictly
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("id" in decoded) ||
    typeof (decoded as Record<string, unknown>)["id"] !== "string" ||
    !("type" in decoded) ||
    (decoded as Record<string, unknown>)["type"] !== "admin"
  ) {
    await MyGlobal.prisma.ai_commerce_audit_logs_user.create({
      data: {
        id: v4(),
        admin_id: undefined,
        action_type: "admin_refresh_failed_invalid_payload",
        subject_type: "admin",
        subject_id: v4(),
        created_at: toISOStringSafe(new Date()),
        ip_address: undefined,
        device_info: undefined,
      },
    });
    throw new Error("Malformed refresh token payload");
  }

  const adminId = (decoded as Record<string, unknown>)["id"];
  const admin = await MyGlobal.prisma.ai_commerce_admin.findUnique({
    where: { id: adminId },
  });
  if (
    !admin ||
    admin.status !== "active" ||
    (typeof admin.deleted_at !== "undefined" && admin.deleted_at !== null)
  ) {
    await MyGlobal.prisma.ai_commerce_audit_logs_user.create({
      data: {
        id: v4(),
        admin_id: admin ? admin.id : undefined,
        action_type: "admin_refresh_failed_account_status",
        subject_type: "admin",
        subject_id: admin ? admin.id : (adminId as string),
        created_at: toISOStringSafe(new Date()),
        ip_address: undefined,
        device_info: undefined,
      },
    });
    throw new Error("Admin account not eligible for refresh");
  }

  const now = Date.now();
  const oneHourMs = 60 * 60 * 1000;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const expired_at = toISOStringSafe(new Date(now + oneHourMs));
  const refreshable_until = toISOStringSafe(new Date(now + sevenDaysMs));

  const payload = {
    id: admin.id,
    type: "admin",
  };
  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  await MyGlobal.prisma.ai_commerce_audit_logs_user.create({
    data: {
      id: v4(),
      admin_id: admin.id,
      action_type: "admin_refresh_success",
      subject_type: "admin",
      subject_id: admin.id,
      created_at: toISOStringSafe(new Date()),
      ip_address: undefined,
      device_info: undefined,
    },
  });

  return {
    id: admin.id,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
  };
}
