import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_customer_join_duplicate_phone_failure(
  connection: api.IConnection,
) {
  /**
   * Validate that customer registration fails when using a phone number that is
   * already in use by another customer.
   *
   * This test confirms the enforcement of unique phone number constraints for
   * customer signup. It executes the following workflow:
   *
   * 1. Register a customer with a unique phone number.
   * 2. Attempt to register a second customer with a different email but the same
   *    phone number.
   * 3. Assert that the second registration fails due to phone number duplication
   *    (business validation error).
   * 4. Confirm that no auth tokens or customer entity are returned on the second
   *    attempt.
   */

  // 1. Register a customer with a unique phone number
  const phone_number: string = RandomGenerator.mobile();
  const email1: string = `${RandomGenerator.alphaNumeric(10)}@test.com`;
  const password1: string = RandomGenerator.alphaNumeric(16);
  const name1: string = RandomGenerator.name();
  const nickname1: string = RandomGenerator.name();
  const input1 = {
    email: email1,
    phone_number,
    password: password1 as string & tags.Format<"password">,
    name: name1,
    nickname: nickname1,
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const result1 = await api.functional.auth.customer.join(connection, {
    body: input1,
  });
  typia.assert(result1);
  TestValidator.equals(
    "first registration customer phone number matches input",
    result1.customer.phone_number,
    phone_number,
  );
  TestValidator.equals(
    "first registration customer email matches input",
    result1.customer.email,
    email1,
  );

  // 2. Attempt registration with different email, same phone number
  const email2: string = `${RandomGenerator.alphaNumeric(10)}@test.com`;
  const password2: string = RandomGenerator.alphaNumeric(16);
  const name2: string = RandomGenerator.name();
  const nickname2: string = RandomGenerator.name();
  const input2 = {
    email: email2,
    phone_number, // same phone number as before
    password: password2 as string & tags.Format<"password">,
    name: name2,
    nickname: nickname2,
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  await TestValidator.error(
    "registration with duplicate phone number must fail",
    async () => {
      await api.functional.auth.customer.join(connection, { body: input2 });
    },
  );
}
