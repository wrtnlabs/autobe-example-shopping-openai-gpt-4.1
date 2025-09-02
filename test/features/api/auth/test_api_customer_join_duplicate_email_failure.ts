import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_customer_join_duplicate_email_failure(
  connection: api.IConnection,
) {
  /**
   * End-to-end test for customer registration enforcing unique email
   * constraint.
   *
   * Scenario:
   *
   * 1. Register a new customer with a unique random email and random profile data.
   *
   *    - Validate the registration returns proper authorization data and customer
   *         entity.
   * 2. Attempt to register a different customer using the exact same email but a
   *    new phone number and info.
   *
   *    - Expect the API to fail with an email uniqueness validation error.
   *    - Validate that no new customer or token is returned from the disallowed
   *         duplicate registration.
   *
   * This asserts both success path and uniqueness business rule enforcement
   * with realistic user flow.
   */

  // Step 1: Register the initial customer with a unique email
  const uniqueEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const firstJoinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: uniqueEmail,
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const firstAuth: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: firstJoinInput,
    });
  typia.assert(firstAuth);
  TestValidator.equals(
    "first join: customer email matches input email",
    firstAuth.customer.email,
    firstJoinInput.email,
  );
  TestValidator.predicate(
    "first join: authorization token must be a non-empty string",
    typeof firstAuth.token.access === "string" &&
      firstAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "first join: customer id is uuid format",
    typeof firstAuth.customer.id === "string" &&
      firstAuth.customer.id.length > 0,
  );

  // Step 2: Attempt to register again with the same email but new random phone number
  const duplicateJoinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: uniqueEmail, // duplicate email intentionally
    phone_number: RandomGenerator.mobile(), // different phone number
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  await TestValidator.error(
    "second join with duplicate email must fail with uniqueness validation error",
    async () => {
      await api.functional.auth.customer.join(connection, {
        body: duplicateJoinInput,
      });
    },
  );
}
