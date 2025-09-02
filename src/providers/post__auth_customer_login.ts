import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Authenticate customer ('shopping_mall_ai_backend_customers') and issue
 * tokens.
 *
 * This endpoint provides API-based customer login by validating the email and
 * password against the 'shopping_mall_ai_backend_customers' table, ensuring the
 * account is active and not withdrawn, and returns authentication tokens and
 * customer identity for future API access. On successful login, updates
 * 'last_login_at', issues JWT access/refresh tokens, and creates a session
 * record.
 *
 * @param props - Request properties
 * @param props.body - Customer login parameters (email, password)
 * @returns IShoppingMallAiBackendCustomer.IAuthorized - Contains JWT tokens and
 *   customer info
 * @throws {Error} When credentials are invalid, account is inactive, or
 *   withdrawn
 */
export async function post__auth_customer_login(props: {
  body: IShoppingMallAiBackendCustomer.ILogin;
}): Promise<IShoppingMallAiBackendCustomer.IAuthorized> {
  const { email, password } = props.body;
  // 1. Find customer by email where deleted_at is null (not withdrawn)
  const customer =
    await MyGlobal.prisma.shopping_mall_ai_backend_customers.findFirst({
      where: {
        email,
        deleted_at: null,
      },
    });

  if (!customer) {
    throw new Error("Invalid credentials");
  }
  if (!customer.is_active) {
    throw new Error("Account is inactive");
  }

  // 2. Verify password against hash
  const isValidPassword = await MyGlobal.password.verify(
    password,
    customer.password_hash,
  );
  if (!isValidPassword) {
    throw new Error("Invalid credentials");
  }

  // 3. Prepare timestamps
  const now = toISOStringSafe(new Date());

  // 4. Update last_login_at for customer
  await MyGlobal.prisma.shopping_mall_ai_backend_customers.update({
    where: { id: customer.id },
    data: { last_login_at: now },
  });

  // 5. Generate JWT tokens (customer payload with id and type)
  const payload = { id: customer.id, type: "customer" };
  const accessToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { ...payload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // 6. Calculate token expiration datetimes based on JWT payload
  const accessPayload = jwt.decode(accessToken) as { exp: number };
  const refreshPayload = jwt.decode(refreshToken) as { exp: number };
  const expired_at = toISOStringSafe(new Date(accessPayload.exp * 1000));
  const refreshable_until = toISOStringSafe(
    new Date(refreshPayload.exp * 1000),
  );

  // 7. Create customer session record (minimal fields as per schema)
  await MyGlobal.prisma.shopping_mall_ai_backend_customer_sessions.create({
    data: {
      id: v4(),
      customer_id: customer.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip_address: "", // IP/user-agent not available in this context
      user_agent: "",
      expires_at: expired_at,
      created_at: now,
      terminated_at: null,
    },
  });

  // 8. Return authorization info and customer details
  return {
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at,
      refreshable_until,
    },
    customer: {
      id: customer.id,
      email: customer.email,
      phone_number: customer.phone_number,
      name: customer.name,
      nickname:
        typeof customer.nickname === "undefined" ? null : customer.nickname,
      is_active: customer.is_active,
      is_verified: customer.is_verified,
      last_login_at: now,
      created_at: toISOStringSafe(customer.created_at),
      updated_at: toISOStringSafe(customer.updated_at),
      deleted_at:
        typeof customer.deleted_at === "undefined"
          ? null
          : customer.deleted_at
            ? toISOStringSafe(customer.deleted_at)
            : null,
    },
  };
}
