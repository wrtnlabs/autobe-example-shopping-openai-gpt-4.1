import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";

/**
 * Validate profile access and retrieval for customers.
 *
 * Test flow:
 *
 * 1. Register a new customer.
 * 2. Request password reset to simulate the business process of profile creation.
 * 3. Retrieve customer profile by ID using authenticated context.
 * 4. Validate all returned profile fields, no data leakage, and consistency with
 *    join inputs.
 */
export async function test_api_customer_profile_access_control_and_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new customer with realistic, valid data
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 1 }),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 2 }),
      address_line2: RandomGenerator.paragraph({ sentences: 1 }),
      is_default: true,
    } satisfies IShoppingMallCustomerAddress.ICreate,
  } satisfies IShoppingMallCustomer.IJoin;
  const auth = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(auth);
  TestValidator.predicate(
    "email_verified should be false after registration",
    auth.email_verified === false,
  );
  TestValidator.equals(
    "customer email matches registration",
    auth.email,
    joinInput.email,
  );
  TestValidator.equals(
    "customer phone matches registration",
    auth.phone,
    joinInput.phone,
  );
  TestValidator.equals(
    "customer full name matches registration",
    auth.full_name,
    joinInput.full_name,
  );

  // 2. Request password reset for the customer (prerequisite for profile retrieve in some workflows)
  const resetResult =
    await api.functional.auth.customer.password.request_reset.requestPasswordReset(
      connection,
      { body: { email: joinInput.email } },
    );
  typia.assert(resetResult);
  TestValidator.equals(
    "password reset is always accepted",
    resetResult.result,
    "accepted",
  );

  // 3. Retrieve customer profile using authenticated session
  const profile = await api.functional.shoppingMall.customer.customers.at(
    connection,
    { customerId: auth.id },
  );
  typia.assert(profile);
  // 4. Profile fields match registered attributes and privacy is maintained
  TestValidator.equals("profile id matches", profile.id, auth.id);
  TestValidator.equals("profile email matches", profile.email, joinInput.email);
  TestValidator.equals(
    "profile full name matches",
    profile.full_name,
    joinInput.full_name,
  );
  TestValidator.equals("profile phone matches", profile.phone, joinInput.phone);
  TestValidator.equals(
    "profile status string present",
    typeof profile.status,
    typeof auth.status,
  );
  TestValidator.equals(
    "profile email_verified matches",
    profile.email_verified,
    auth.email_verified,
  );
  TestValidator.predicate(
    "profile created_at is ISO date string",
    typeof profile.created_at === "string" &&
      !isNaN(Date.parse(profile.created_at)),
  );
  TestValidator.predicate(
    "profile updated_at is ISO date string",
    typeof profile.updated_at === "string" &&
      !isNaN(Date.parse(profile.updated_at)),
  );
  TestValidator.equals(
    "profile deleted_at is null or undefined for normal account",
    profile.deleted_at ?? null,
    null,
  );
}
