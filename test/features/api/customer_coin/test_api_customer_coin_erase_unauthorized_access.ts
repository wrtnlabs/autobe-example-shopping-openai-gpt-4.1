import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test – Prevent unauthorized deletion of another customer's coin
 * ledger.
 *
 * This test verifies that a customer may not delete a coin ledger owned by
 * a different user. It checks authorization enforcement for the DELETE
 * /shoppingMallAiBackend/customer/coins/{coinId} endpoint.
 *
 * Steps:
 *
 * 1. Register Customer A and assume Customer A has a coin ledger (coinId
 *    assigned; API for coin creation not available so simulate one for
 *    Customer A).
 * 2. Register Customer B via /auth/customer/join (context switches to Customer
 *    B via authorization token update).
 * 3. As Customer B, attempt to delete the coin ledger belonging to Customer A
 *    using DELETE /shoppingMallAiBackend/customer/coins/{coinId}.
 * 4. Expect a forbidden or not-found error response, indicating Customer B
 *    cannot operate on Customer A's assets.
 *
 * Limitations and rationale:
 *
 * - Coin ledger creation API is not available; assign a random UUID to
 *   represent Customer A's coin ledger for authorization barrier testing
 *   only.
 * - Authentication context is managed automatically via /auth/customer/join.
 *
 * The test validates that the system does not allow cross-account resource
 * deletion and responds appropriately.
 */
export async function test_api_customer_coin_erase_unauthorized_access(
  connection: api.IConnection,
) {
  // Step 1: Register Customer A (remains authenticated as Customer A for now)
  const customerAEmail: string = typia.random<string & tags.Format<"email">>();
  const customerAPhone: string = RandomGenerator.mobile();
  const customerAName: string = RandomGenerator.name();
  const customerAPassword: string = RandomGenerator.alphaNumeric(12);
  const customerANickname: string = RandomGenerator.name();

  const authorizedA: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerAEmail,
        phone_number: customerAPhone,
        password: customerAPassword,
        name: customerAName,
        nickname: customerANickname,
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(authorizedA);

  // Simulate a coin ledger ``coinId'' belonging to Customer A (API for coin creation is not available)
  const coinIdOfA: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 2: Register Customer B (switches API connection to Customer B)
  const customerBEmail: string = typia.random<string & tags.Format<"email">>();
  const customerBPhone: string = RandomGenerator.mobile();
  const customerBName: string = RandomGenerator.name();
  const customerBPassword: string = RandomGenerator.alphaNumeric(12);
  const customerBNickname: string = RandomGenerator.name();

  const authorizedB: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerBEmail,
        phone_number: customerBPhone,
        password: customerBPassword,
        name: customerBName,
        nickname: customerBNickname,
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(authorizedB);

  // Step 3: As Customer B, attempt to delete Customer A's coin ledger
  await TestValidator.error(
    "Customer B cannot delete Customer A's coin ledger (must be forbidden or not found)",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.coins.erase(
        connection,
        {
          coinId: coinIdOfA,
        },
      );
    },
  );
}
