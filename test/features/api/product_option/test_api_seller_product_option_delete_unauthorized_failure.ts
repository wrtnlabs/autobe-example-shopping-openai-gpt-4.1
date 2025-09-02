import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Attempt to delete a product option group without authentication as a
 * seller and confirm an authorization error is returned.
 *
 * This test verifies that destructive seller operations (deleting a
 * product's option group) are not allowed without proper seller
 * authentication. It uses syntactically valid random UUIDs for productId
 * and optionId but does NOT authenticate or join as a seller before the
 * call. The test passes if the endpoint rejects the unauthorized call due
 * to missing Authorization token—not for reasons such as a missing
 * resource. No seller join or token acquisition is performed: the call is
 * guaranteed to be unauthenticated.
 *
 * Steps:
 *
 * 1. Create a new unauthenticated connection (headers: {}), so no
 *    Authorization header exists.
 * 2. Generate random UUIDs for productId and optionId (to guarantee format
 *    validity).
 * 3. Attempt to call the erase endpoint as an unauthenticated user.
 * 4. Validate that an authorization error results (using TestValidator.error).
 */
export async function test_api_seller_product_option_delete_unauthorized_failure(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Ensure completely unauthenticated connection (fresh empty headers)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 2: Generate syntactically valid UUIDs for product and option group
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const optionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3 & 4: Attempt deletion, expecting an authorization error
  await TestValidator.error(
    "should reject unauthenticated product option group deletion attempt",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.options.erase(
        unauthConnection,
        {
          productId,
          optionId,
        },
      );
    },
  );
}
