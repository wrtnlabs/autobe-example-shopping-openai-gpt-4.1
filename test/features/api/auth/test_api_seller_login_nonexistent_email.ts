import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_seller_login_nonexistent_email(
  connection: api.IConnection,
) {
  /**
   * Test scenario: Seller login should fail when a non-existent email address
   * is used.
   *
   * - Simulates a login attempt as a seller using a random, valid-looking email
   *   address that is extremely unlikely to exist in the system (not
   *   registered).
   * - Uses a random but valid password string that meets the password format.
   * - Expects the login API to fail, so the test will validate an error is thrown
   *   (runtime, not TypeScript compilation failure).
   * - This test covers the negative login path for a seller with a non-existent
   *   email address, ensuring proper authentication failure and error
   *   response.
   */
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  await TestValidator.error(
    "seller login should fail with non-existent email",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: {
          email,
          password,
        } satisfies IShoppingMallAiBackendSeller.ILogin,
      });
    },
  );
}
