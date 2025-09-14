import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";
import { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";

/**
 * Register a new buyer (ai_commerce_buyer table) and issue JWT tokens.
 *
 * This endpoint allows a new user to register as a buyer, creating a record in
 * the ai_commerce_buyer table. It enforces email uniqueness, hashes the
 * password before saving, and initializes the account with 'active' status.
 * Upon successful account creation, JWT access and refresh tokens are returned,
 * initialized for session management. No authentication is required for
 * registration, and attempts to register with an existing email will result in
 * a business-level error.
 *
 * @param props - Request properties containing the buyer registration payload.
 *
 *   - Props.body: The registration request (email and password)
 *
 * @returns IAiCommerceBuyer.IAuthorized - Authorized session with JWT tokens
 *   and minimal buyer context
 * @throws {Error} If email already exists (duplicate registration attempt)
 */
export async function postauthBuyerJoin(props: {
  body: IBuyer.ICreate;
}): Promise<IAiCommerceBuyer.IAuthorized> {
  const { email, password } = props.body;
  // Step 1: Enforce uniqueness of email
  const existing = await MyGlobal.prisma.ai_commerce_buyer.findUnique({
    where: { email },
  });
  if (existing) throw new Error("Duplicate email");

  // Step 2: Hash password (never store plain)
  const password_hash = await MyGlobal.password.hash(password);

  // Step 3: Generate buyer id and timestamps
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Step 4: Create buyer record
  const buyer = await MyGlobal.prisma.ai_commerce_buyer.create({
    data: {
      id,
      email,
      password_hash,
      status: "active",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Step 5: JWT tokens and expiration calculation
  const accessDurationMs = 1000 * 60 * 60; // 1 hour
  const refreshDurationMs = 1000 * 60 * 60 * 24 * 7; // 7 days
  const expired_at = toISOStringSafe(new Date(Date.now() + accessDurationMs));
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + refreshDurationMs),
  );

  const token = {
    access: jwt.sign(
      { id: buyer.id, type: "buyer" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      { id: buyer.id, type: "buyer" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at,
    refreshable_until,
  };

  // Step 6: Compose session/authorized context
  return {
    id: buyer.id,
    email: buyer.email,
    role: "buyer",
    token,
    buyer: {
      id: buyer.id,
      email: buyer.email,
      role: "buyer",
    },
  };
}
