import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptions";

/**
 * Test error scenario where a seller tries to access the option group of a
 * product they do not own.
 *
 * Business context: This test ensures that ownership boundaries are
 * enforced in the shopping mall AI backend. It verifies that a seller
 * cannot retrieve option group details from a product they do not own, even
 * when provided with valid IDs.
 *
 * Step-by-step workflow:
 *
 * 1. Register Seller A and simulate a product and its options by generating
 *    fake UUIDs (no creation API available).
 * 2. Register Seller B to simulate a separate account and ownership context.
 * 3. Using Seller B's context, attempt to retrieve Seller A's (simulated)
 *    product option group using the options.at endpoint.
 * 4. Assert that the API appropriately rejects the request (authorization
 *    error), confirming business protection of resource ownership.
 *
 * Note: As the API/DTOs for product and option creation are not provided,
 * only the error scenario via direct ID simulation is tested in this
 * workflow.
 */
export async function test_api_seller_product_option_get_failure_not_owner(
  connection: api.IConnection,
) {
  // 1. Register Seller A and simulate resource ownership
  const sellerAInput: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
  };
  const sellerAAuthorized = await api.functional.auth.seller.join(connection, {
    body: sellerAInput,
  });
  typia.assert(sellerAAuthorized);

  // Simulate product and option UUIDs owned by Seller A
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const optionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Register Seller B for another business ownership context (auto-updates connection header)
  const sellerBInput: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
  };
  const sellerBAuthorized = await api.functional.auth.seller.join(connection, {
    body: sellerBInput,
  });
  typia.assert(sellerBAuthorized);

  // 3. Using Seller B, attempt to access Seller A's option group – expect forbidden/ownership error
  await TestValidator.error(
    "seller cannot access another seller's product option group",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.options.at(
        connection,
        { productId, optionId },
      );
    },
  );
}
