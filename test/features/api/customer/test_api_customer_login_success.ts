import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test successful login for an active customer.
 *
 * This test verifies the login endpoint (/auth/customer/login) for a
 * successful and valid customer account.
 *
 * Steps:
 *
 * 1. Register a new customer account (join) with unique, valid credentials.
 *    Capture email, phone_number, name, and password.
 * 2. Log in using the previously registered email and password via the login
 *    API.
 * 3. Confirm the login response:
 *
 *    - Returns a valid IAuthorizationToken
 *    - Customer object has the same email, phone_number, name as registered
 *    - Last_login_at is now present and recent (not null)
 *    - Is_active is true, deleted_at is null
 *    - The session is fully authorized for the customer
 * 4. Optionally validate that last_login_at is after or nearly equal to
 *    created_at and updated_at
 * 5. The test must check both tokens (access/refresh) are present and
 *    non-empty.
 */
export async function test_api_customer_login_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer and save credentials
  const email = typia.random<string & tags.Format<"email">>();
  const phone_number = RandomGenerator.mobile();
  const password = RandomGenerator.alphaNumeric(12) + "A1!"; // ensure some complexity
  const name = RandomGenerator.name();
  const nickname = RandomGenerator.name();

  const joinOutput: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email,
        phone_number,
        password,
        name,
        nickname,
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(joinOutput);

  // Step 2: Login using the saved credentials
  const loginOutput: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email,
        password,
      } satisfies IShoppingMallAiBackendCustomer.ILogin,
    });
  typia.assert(loginOutput);

  // Step 3: Validate tokens
  TestValidator.predicate(
    "access token is present",
    typeof loginOutput.token.access === "string" &&
      loginOutput.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    typeof loginOutput.token.refresh === "string" &&
      loginOutput.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expires is a valid ISO date",
    typeof loginOutput.token.expired_at === "string" &&
      !isNaN(Date.parse(loginOutput.token.expired_at)),
  );
  TestValidator.predicate(
    "refresh token expires is a valid ISO date",
    typeof loginOutput.token.refreshable_until === "string" &&
      !isNaN(Date.parse(loginOutput.token.refreshable_until)),
  );

  // Step 4: Validate customer object
  const customer = loginOutput.customer;
  TestValidator.equals("login returns correct email", customer.email, email);
  TestValidator.equals(
    "login returns correct phone_number",
    customer.phone_number,
    phone_number,
  );
  TestValidator.equals("login returns correct name", customer.name, name);
  TestValidator.equals(
    "login returns correct nickname",
    customer.nickname,
    nickname,
  );
  TestValidator.equals("customer is active", customer.is_active, true);
  TestValidator.equals(
    "customer is verified has some boolean value",
    typeof customer.is_verified,
    "boolean",
  );
  TestValidator.equals("customer is not deleted", customer.deleted_at, null);
  TestValidator.predicate(
    "customer.last_login_at is now present",
    typeof customer.last_login_at === "string" &&
      !isNaN(Date.parse(customer.last_login_at!)),
  );

  // last_login_at must be different from created_at (should be new login)
  const created_at_time = Date.parse(customer.created_at);
  const login_time = Date.parse(customer.last_login_at!);
  TestValidator.predicate(
    "login time is after or equal to created_at",
    login_time >= created_at_time,
  );
}
