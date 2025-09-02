import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_seller_join_duplicate_business_registration_number_failure(
  connection: api.IConnection,
) {
  /**
   * E2E test for verifying uniqueness constraint on business registration
   * numbers in seller onboarding.
   *
   * 1. Register a new seller with a unique business registration number and email.
   *    Expect success.
   * 2. Attempt to register a second seller with a different email but the same
   *    business registration number. The second registration must fail with a
   *    uniqueness violation error, confirming business logic and compliance
   *    enforcement.
   */
  // Step 1: Register the initial seller with a unique business registration number
  const initialBusinessRegNumber = RandomGenerator.alphaNumeric(12);
  const initialSellerEmail = `${RandomGenerator.alphaNumeric(8)}@corp-test.com`;
  const initialBusinessName = RandomGenerator.name();
  const initialRegistration = await api.functional.auth.seller.join(
    connection,
    {
      body: {
        email: initialSellerEmail,
        business_registration_number: initialBusinessRegNumber,
        name: initialBusinessName,
      } satisfies IShoppingMallAiBackendSeller.ICreate,
    },
  );
  typia.assert(initialRegistration);
  TestValidator.predicate(
    "initial seller registered with unique business registration number",
    typeof initialRegistration.seller.id === "string" &&
      initialRegistration.seller.business_registration_number ===
        initialBusinessRegNumber,
  );

  // Step 2: Attempt to register a different seller with a different email but the same business registration number
  const duplicateSellerEmail = `${RandomGenerator.alphaNumeric(7)}@corp-test.com`;
  const duplicateBusinessName = RandomGenerator.name();
  await TestValidator.error(
    "should fail on duplicate business registration number",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: {
          email: duplicateSellerEmail,
          business_registration_number: initialBusinessRegNumber, // duplicate
          name: duplicateBusinessName,
        } satisfies IShoppingMallAiBackendSeller.ICreate,
      });
    },
  );
}
