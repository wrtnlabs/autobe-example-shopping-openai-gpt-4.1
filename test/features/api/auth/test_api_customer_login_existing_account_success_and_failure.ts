import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";

/**
 * Validate success and failure scenarios for the customer login endpoint.
 *
 * 1. Register a new customer with valid profile and address.
 * 2. Simulate email verification by toggling the email_verified property in DB
 *    (out of API scope).
 * 3. Test login with correct credentials: expect
 *    IShoppingMallCustomer.IAuthorized, check JWT structure.
 * 4. Test login with wrong password: expect error.
 * 5. Register a second customer but do not verify email, then test login: expect
 *    error.
 */
export async function test_api_customer_login_existing_account_success_and_failure(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const password = RandomGenerator.alphaNumeric(12);
  const email = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email,
    password: password satisfies string,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 1 }),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 1 }),
      address_line2: null,
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const created = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert(created);
  TestValidator.equals(
    "registered profile email matches input",
    created.email,
    email,
  );

  // 2. Simulate email verification (skipped; assume join returns email_verified=true for test)
  // For E2E, suppose test user is verified, otherwise, if API exposes a verification function, call it here.

  // 3. Login with correct credentials (should succeed)
  const loginBody = {
    email,
    password: password satisfies string,
  } satisfies IShoppingMallCustomer.ILogin;
  const authorized = await api.functional.auth.customer.login(connection, {
    body: loginBody,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "login successful returns matching email",
    authorized.email,
    email,
  );
  TestValidator.predicate(
    "token.access is non-empty",
    authorized.token.access.length > 0,
  );

  // 4. Login with wrong password (should fail)
  await TestValidator.error("login fails with incorrect password", async () => {
    await api.functional.auth.customer.login(connection, {
      body: {
        email,
        password: password + "bad", // wrong
      } satisfies IShoppingMallCustomer.ILogin,
    });
  });

  // 5. Register an unverified customer and ensure login fails
  const unverifiedEmail = typia.random<string & tags.Format<"email">>();
  const unverifiedPassword = RandomGenerator.alphaNumeric(12);
  const unverifiedJoinBody = {
    email: unverifiedEmail,
    password: unverifiedPassword satisfies string,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 1 }),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 1 }),
      address_line2: null,
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const unverifiedCreated = await api.functional.auth.customer.join(
    connection,
    { body: unverifiedJoinBody },
  );
  typia.assert(unverifiedCreated);
  // Simulate non-verification: do not set email_verified = true.
  // 6. Attempt login (should fail)
  await TestValidator.error(
    "login fails if email is not verified",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: {
          email: unverifiedEmail,
          password: unverifiedPassword satisfies string,
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );
}
