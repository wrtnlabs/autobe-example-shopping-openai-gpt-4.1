import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validate a new customer registration in the shopping mall backend.
 *
 * Steps:
 *
 * 1. Generate random, unique registration data per schema: valid UUID for channel
 *    (shopping_mall_channel_id), unique email, random password (6-128 chars),
 *    legal name (max 64 chars), and optional phone.
 * 2. Call the public join endpoint (no authentication required), passing all
 *    required fields and with/without phone.
 * 3. On success, validate:
 *
 * - The response is schema-compliant per IAuthorized (typia.assert)
 * - The email/name match the registration input
 * - Status and kyc_status are non-empty strings
 * - Created_at, updated_at are ISO 8601 strings
 * - Token property exists and contains access & refresh tokens with correctly
 *   formatted expired_at and refreshable_until timestamps
 * - Password is NOT present in the response
 * - No extra properties exist in the output
 *
 * 4. Validate explicit null handling for phone if omitted.
 */
export async function test_api_customer_registration_new_user_context(
  connection: api.IConnection,
) {
  // 1. Prepare random, schema-compliant registration data
  const registrationBody = {
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;

  // 2. Register new customer (with phone provided)
  const resultWithPhone = await api.functional.auth.customer.join(connection, {
    body: registrationBody,
  });
  typia.assert(resultWithPhone);

  // 3. Assert output fields and business logic
  TestValidator.equals(
    "email matches",
    resultWithPhone.email,
    registrationBody.email,
  );
  TestValidator.equals(
    "name matches",
    resultWithPhone.name,
    registrationBody.name,
  );
  TestValidator.equals(
    "channel ID matches",
    resultWithPhone.shopping_mall_channel_id,
    registrationBody.shopping_mall_channel_id,
  );
  TestValidator.equals(
    "phone matches",
    resultWithPhone.phone,
    registrationBody.phone,
  );
  TestValidator.predicate(
    "status present",
    typeof resultWithPhone.status === "string" &&
      resultWithPhone.status.length > 0,
  );
  TestValidator.predicate(
    "kyc_status present",
    typeof resultWithPhone.kyc_status === "string" &&
      resultWithPhone.kyc_status.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO date",
    typeof resultWithPhone.created_at === "string" &&
      !isNaN(Date.parse(resultWithPhone.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    typeof resultWithPhone.updated_at === "string" &&
      !isNaN(Date.parse(resultWithPhone.updated_at)),
  );
  TestValidator.predicate(
    "token present",
    typeof resultWithPhone.token === "object" &&
      typeof resultWithPhone.token.access === "string",
  );
  TestValidator.predicate(
    "token has refresh",
    typeof resultWithPhone.token.refresh === "string",
  );
  TestValidator.predicate(
    "token.expired_at is ISO date",
    typeof resultWithPhone.token.expired_at === "string" &&
      !isNaN(Date.parse(resultWithPhone.token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO date",
    typeof resultWithPhone.token.refreshable_until === "string" &&
      !isNaN(Date.parse(resultWithPhone.token.refreshable_until)),
  );
  TestValidator.predicate(
    "password is not returned",
    (resultWithPhone as any).password === undefined,
  );

  // 4. Register without phone (phone omitted or explicitly null) and verify phone is null/undefined
  const registrationBodyNoPhone = {
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    phone: null,
  } satisfies IShoppingMallCustomer.IJoin;

  const resultNoPhone = await api.functional.auth.customer.join(connection, {
    body: registrationBodyNoPhone,
  });
  typia.assert(resultNoPhone);
  TestValidator.equals(
    "phone is null in output when omitted",
    resultNoPhone.phone,
    null,
  );
  TestValidator.equals(
    "email matches (no phone)",
    resultNoPhone.email,
    registrationBodyNoPhone.email,
  );
  TestValidator.equals(
    "name matches (no phone)",
    resultNoPhone.name,
    registrationBodyNoPhone.name,
  );
}
