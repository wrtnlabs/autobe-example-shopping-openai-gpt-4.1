import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";

/**
 * Register a new administrator account for the aiCommerce platform.
 *
 * This operation allows privileged provisioning of admin users into the
 * platform using a unique email address, a securely hashed password, and an
 * initial account status. Only internal or automated system actors may invoke
 * this endpoint—public registration is strictly prohibited. Admins created here
 * can access platform-wide controls, user/seller moderation, and compliance
 * actions. All credentials and tokens are managed in accordance with platform
 * security policy, including password hashing and unique email validation.
 * Actions are strictly audit-logged upstream.
 *
 * @param props - Object containing admin registration details
 * @param props.body - New admin registration input (email, password, status)
 * @returns Authorized admin object with JWT authentication tokens
 * @throws {Error} If email already exists or status is invalid
 */
export async function postauthAdminJoin(props: {
  body: IAiCommerceAdmin.IJoin;
}): Promise<IAiCommerceAdmin.IAuthorized> {
  const { email, password, status } = props.body;
  // Business: only allow accepted status values
  const allowedStatus = ["active", "suspended"];
  // Uniqueness check
  const existing = await MyGlobal.prisma.ai_commerce_admin.findFirst({
    where: { email },
  });
  if (existing) {
    throw new Error("Email already registered");
  }
  if (!allowedStatus.includes(status)) {
    throw new Error("Invalid status value");
  }
  // Password hash
  const password_hash = await MyGlobal.password.hash(password);
  // Current times
  const now = toISOStringSafe(new Date());
  // Immutable ID generation
  const id = v4() as string & tags.Format<"uuid">;
  // Create admin row
  await MyGlobal.prisma.ai_commerce_admin.create({
    data: {
      id,
      email,
      password_hash,
      status,
      created_at: now,
      updated_at: now,
    },
  });
  // Compose JWT payload
  const payload = { id, type: "admin" };
  // Access token expires in 1 hour, refresh in 7 days
  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  // Compute token expiration timestamps, ISO with branding
  const expired_at = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  return {
    id,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
  };
}
