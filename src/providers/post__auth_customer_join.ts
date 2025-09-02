import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Registers a new customer in 'shopping_mall_ai_backend_customers', issuing JWT
 * tokens.
 *
 * This endpoint enables new customer onboarding for the shopping mall service.
 * It enforces unique email and phone_number, hashes the password, creates a
 * customer record, and returns authentication tokens and the onboarded user
 * (without sensitive fields). Timestamps are strictly ISO-formatted, and no
 * plain password is ever stored.
 *
 * @param props - Request properties
 * @param props.body - Customer registration input, including required
 *   authentication and identity details
 * @returns The authorized customer identity and tokens for API use
 * @throws {Error} When a customer with the same email or phone number already
 *   exists
 */
export async function post__auth_customer_join(props: {
  body: IShoppingMallAiBackendCustomer.IJoin;
}): Promise<IShoppingMallAiBackendCustomer.IAuthorized> {
  const { body } = props;

  // 1. Check for duplicate email
  const existingByEmail =
    await MyGlobal.prisma.shopping_mall_ai_backend_customers.findFirst({
      where: { email: body.email },
    });
  if (existingByEmail)
    throw new Error("A customer with this email already exists.");

  // 2. Check for duplicate phone_number
  const existingByPhone =
    await MyGlobal.prisma.shopping_mall_ai_backend_customers.findFirst({
      where: { phone_number: body.phone_number },
    });
  if (existingByPhone)
    throw new Error("A customer with this phone number already exists.");

  // 3. Generate ID and hash password
  const id = v4() as string & tags.Format<"uuid">;
  const password_hash = await MyGlobal.password.hash(body.password);
  const now = toISOStringSafe(new Date());
  // 4. Create new customer
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_customers.create({
      data: {
        id,
        email: body.email,
        phone_number: body.phone_number,
        password_hash,
        name: body.name,
        nickname: body.nickname ?? null,
        is_active: true,
        is_verified: false, // customer must verify after join
        last_login_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // 5. JWT tokens and expiry calculations
  const accessTokenExpiresInSec = 60 * 60; // 1 hour
  const refreshTokenExpiresInSec = 60 * 60 * 24 * 7; // 7 days
  const accessExp = new Date(Date.now() + accessTokenExpiresInSec * 1000);
  const refreshExp = new Date(Date.now() + refreshTokenExpiresInSec * 1000);

  const payload = { id, type: "customer" };
  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: accessTokenExpiresInSec,
    issuer: "autobe",
  });
  const refresh = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: refreshTokenExpiresInSec,
    issuer: "autobe",
  });

  return {
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessExp),
      refreshable_until: toISOStringSafe(refreshExp),
    },
    customer: {
      id: created.id,
      email: created.email,
      phone_number: created.phone_number,
      name: created.name,
      nickname: created.nickname ?? null,
      is_active: created.is_active,
      is_verified: created.is_verified,
      last_login_at: null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    },
  };
}
