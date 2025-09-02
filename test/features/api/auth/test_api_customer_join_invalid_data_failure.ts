import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_customer_join_invalid_data_failure(
  connection: api.IConnection,
) {
  /**
   * Validate registration failure with invalid or missing required data for the
   * customer join endpoint (/auth/customer/join).
   *
   * This E2E test ensures all of the following:
   *
   * 1. Omission of the required "name" field is rejected by the API.
   * 2. An invalid email address format is rejected by the API.
   * 3. A password string that does not match the required password format is
   *    rejected by the API.
   * 4. Omission of multiple required fields, or all required fields, is rejected
   *    by the API.
   * 5. No authentication tokens or customer entities are returned in any error
   *    scenario.
   *
   * Each block uses TestValidator.error with async callback to ensure the API
   * throws and does not create an account or issue any credentials, maintaining
   * compliance and security.
   */

  // 1. Attempt with missing "name"
  await TestValidator.error(
    "missing name should cause validation error",
    async () => {
      await api.functional.auth.customer.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          phone_number: RandomGenerator.mobile(),
          password: typia.random<string & tags.Format<"password">>(),
          // name field omitted intentionally
        } as any, // Purposeful for runtime validation test
      });
    },
  );

  // 2. Attempt with invalid email format
  await TestValidator.error(
    "invalid email format should cause validation error",
    async () => {
      await api.functional.auth.customer.join(connection, {
        body: {
          email: "not-an-email",
          phone_number: RandomGenerator.mobile(),
          password: typia.random<string & tags.Format<"password">>(),
          name: RandomGenerator.name(),
        } satisfies IShoppingMallAiBackendCustomer.IJoin,
      });
    },
  );

  // 3. Attempt with invalid password format
  await TestValidator.error(
    "password not meeting format should cause validation error",
    async () => {
      await api.functional.auth.customer.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          phone_number: RandomGenerator.mobile(),
          password: "short", // fails password format
          name: RandomGenerator.name(),
        } satisfies IShoppingMallAiBackendCustomer.IJoin,
      });
    },
  );

  // 4. Attempt with missing all required fields
  await TestValidator.error(
    "missing all required fields should cause validation error",
    async () => {
      await api.functional.auth.customer.join(connection, {
        body: {} as any, // All required fields omitted
      });
    },
  );
}
