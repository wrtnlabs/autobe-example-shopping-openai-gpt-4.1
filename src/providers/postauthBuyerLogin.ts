import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";
import { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";

/**
 * Authenticate buyer by email and password (ai_commerce_buyer), return JWT
 * tokens
 *
 * This endpoint provides buyer login functionality for the aiCommerce platform.
 * It authenticates a buyer using their email and password, verifies the hashed
 * password against ai_commerce_buyer table (ensuring active, non-deleted
 * status), and issues JWT tokens for buyer session management. All credential
 * checking is conducted securely, with strict error privacy; only generic
 * errors are returned for all failure cases. Issued tokens use strict date-time
 * branding and never expose Date types or use unsafe type assertions anywhere.
 *
 * @param props - Request parameter object
 * @param props.body - Buyer login credentials (email & password)
 * @returns Authorization response with session JWT tokens and minimal buyer
 *   info
 * @throws {Error} When authentication fails (invalid credentials,
 *   inactive/deleted account, wrong password, or any other rejection)
 */
export async function postauthBuyerLogin(props: {
  body: IBuyer.ILogin;
}): Promise<IAiCommerceBuyer.IAuthorized> {
  const { email, password } = props.body;
  // Look up non-deleted, active buyer matching email
  const buyer = await MyGlobal.prisma.ai_commerce_buyer.findFirst({
    where: {
      email,
      status: "active",
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
    },
  });
  if (!buyer) {
    throw new Error("Invalid credentials");
  }
  const isValid = await MyGlobal.password.verify(password, buyer.password_hash);
  if (!isValid) {
    throw new Error("Invalid credentials");
  }
  const now = Date.now();
  const accessExpire = new Date(now + 60 * 60 * 1000);
  const refreshExpire = new Date(now + 7 * 24 * 60 * 60 * 1000);
  const access = jwt.sign(
    { id: buyer.id, type: "buyer" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    { id: buyer.id, type: "buyer" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  return {
    id: buyer.id,
    email: buyer.email,
    role: "buyer",
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessExpire),
      refreshable_until: toISOStringSafe(refreshExpire),
    },
    buyer: {
      id: buyer.id,
      email: buyer.email,
      role: "buyer",
    },
  };
}
