import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test logical (soft) deletion of customer digital coin ledger (wallet).
 *
 * This test validates that a customer can soft-delete (logically erase)
 * their own coin ledger. Logical erase means the coin is marked with a
 * deleted_at timestamp and hidden from normal access, but retained for
 * audit/compliance retention. The test ensures:
 *
 * 1. Customer registration (with automatic authentication context for
 *    subsequent requests)
 * 2. (OMITTED) Normally, creation of an actual coin ledger (wallet) would be
 *    tested here; however, there is no coin creation endpoint in the
 *    available API materials. Instead, a random UUID is generated solely
 *    for call contract compliance.
 * 3. Logical erase (soft-deletion) is performed by calling DELETE
 *    /shoppingMallAiBackend/customer/coins/{coinId}.
 * 4. (OMITTED) Post-delete verification that the coin is hidden from standard
 *    queries would occur here, but as there are no queries/list endpoints
 *    for coins, this cannot be tested.
 * 5. (OMITTED) Compliance/audit evidence verification after deletion cannot be
 *    performed without supporting endpoints.
 *
 * As a result, this test covers registration and soft-deletion E2E, but
 * cannot validate the post-conditions due to API limitations.
 */
export async function test_api_customer_coin_erase_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer (also provides authentication context)
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(joinResult);
  // Side note: joinResult.customer.id provides customer user ID

  // Step 2: (OMITTED) No coin creation API provided; so coinId is just simulated for contract compliance
  const testCoinId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Soft-delete (logically erase) the presumed coin ledger
  await api.functional.shoppingMallAiBackend.customer.coins.erase(connection, {
    coinId: testCoinId,
  });

  // Step 4: (OMITTED) No coin list/fetch endpoint, so we cannot verify ledger is hidden after erase
  // Step 5: (OMITTED) No compliance/audit endpoint, so cannot assert evidence retention
}
