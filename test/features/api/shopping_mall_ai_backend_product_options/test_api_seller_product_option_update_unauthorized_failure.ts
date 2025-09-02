import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptions";

export async function test_api_seller_product_option_update_unauthorized_failure(
  connection: api.IConnection,
) {
  /**
   * Test that updating a product option group without seller authentication
   * fails.
   *
   * This test ensures that the endpoint for updating an option group for a
   * product strictly requires that the caller is an authenticated seller.
   * Without proper authentication, the system must deny access and not permit
   * any updates.
   *
   * Steps:
   *
   * 1. Create an unauthenticated API connection (no Authorization header).
   * 2. Attempt to update a product option group with random UUIDs and valid update
   *    input.
   * 3. Validate that the API call fails with an authorization/forbidden error.
   * 4. Do not perform any login prior to the update attempt.
   */
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "Should not allow option group update without seller authentication",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.options.update(
        unauthConn,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          optionId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            option_name: RandomGenerator.paragraph({ sentences: 2 }),
            required: true,
            sort_order: 1,
          } satisfies IShoppingMallAiBackendProductOptions.IUpdate,
        },
      );
    },
  );
}
