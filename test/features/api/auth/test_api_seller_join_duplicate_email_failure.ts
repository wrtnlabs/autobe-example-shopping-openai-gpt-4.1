import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_seller_join_duplicate_email_failure(
  connection: api.IConnection,
) {
  /**
   * This test ensures the seller registration API enforces unique emails.
   *
   * Steps:
   *
   * 1. Register a seller with a generated unique email, business registration
   *    number, and name.
   * 2. Confirm successful onboarding and JWT token issuance.
   * 3. Attempt to register another seller using the same email but with a
   *    different business registration number and name.
   * 4. Verify the duplicate registration attempt fails (error is thrown, no token
   *    is issued).
   */
  // 1. Register the first seller with a unique email
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const firstSellerInput = {
    email: uniqueEmail,
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAiBackendSeller.ICreate;

  const firstSellerAuth = await api.functional.auth.seller.join(connection, {
    body: firstSellerInput,
  });
  typia.assert(firstSellerAuth);
  TestValidator.equals(
    "first registration result email matches input",
    firstSellerAuth.seller.email,
    uniqueEmail,
  );

  // 2. Attempt duplicate registration with the same email, different business registration number
  const secondSellerInput = {
    email: uniqueEmail,
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAiBackendSeller.ICreate;

  await TestValidator.error(
    "second registration with duplicate email must fail",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: secondSellerInput,
      });
    },
  );
}
