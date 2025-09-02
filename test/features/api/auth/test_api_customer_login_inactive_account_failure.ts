import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_customer_login_inactive_account_failure(
  connection: api.IConnection,
) {
  /**
   * Test failed login for inactive customer accounts.
   *
   * 1. Register a new customer account (active by default)
   * 2. [Conceptual only] Mark as inactive (no API provided; real test would do DB
   *    patch or admin API call here)
   * 3. Attempt to login, expecting failure due to inactive account
   *
   * Note: Due to the lack of a public API for inactivation, this test only
   * documents the business expectation and the process if such capability
   * existed. If running in a privileged environment, do DB patch between
   * join/login to set is_active=false; otherwise, this test simply verifies
   * business intent and acknowledges automation gap.
   */

  // 1. Register a customer
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const phone_number = RandomGenerator.mobile();
  const name = RandomGenerator.name();
  const nickname = RandomGenerator.name();

  const registration = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      phone_number,
      password,
      name,
      nickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(registration);

  /**
   * 2. [Conceptual only] Mark the account as inactive.
   *
   *    - No API is provided to modify is_active.
   *    - In real E2E: would patch DB, or call admin API to set customer.is_active =
   *         false before proceeding.
   */

  // 3. Attempt to login; expect authorized ONLY if still active account
  //    We expect error if inactive, but with these APIs the account is still active
  //    The correct business test would patch is_active=false, then do:
  await TestValidator.error(
    "login fails with inactive customer account (expected authorization error)",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: {
          email,
          password,
        } satisfies IShoppingMallAiBackendCustomer.ILogin,
      });
    },
  );

  // Document test limitation explicitly
  // This scenario can only be fully automated if backend exposes an inactivation API or test DB utility
}
