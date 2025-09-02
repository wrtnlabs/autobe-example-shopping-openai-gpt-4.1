import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCartItem";

export async function test_api_admin_cart_item_not_found_error(
  connection: api.IConnection,
) {
  /**
   * Test admin cannot retrieve a non-existent cart item.
   *
   * Business context: Ensures that the admin is authenticated, then attempts to
   * fetch a cart item using random UUIDs for cartId and itemId (ensuring no
   * such cart or item exists). The purpose is to guarantee the API responds
   * with an error (not found) and that no sensitive internal data is exposed in
   * the process.
   *
   * Steps:
   *
   * 1. Register a new admin for authentication context
   * 2. Attempt to retrieve cart item with random, non-existent cartId and itemId
   * 3. Assert that the API call fails as expected (error thrown—404 not found or
   *    similar)
   */

  // Step 1: Register a new admin (create authentication context)
  const adminUsername = RandomGenerator.alphabets(10);
  const adminEmail = `${RandomGenerator.alphabets(8)}@test.com`;
  const adminPassword = RandomGenerator.alphaNumeric(16); // literal for placeholder; backend expects hash
  await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword,
      name: RandomGenerator.name(),
      email: adminEmail,
      is_active: true,
      phone_number: null,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });

  // Step 2 & 3: Attempt to fetch a cart item with random UUIDs (guaranteed nonexistent)
  await TestValidator.error(
    "admin cannot retrieve nonexistent cart item",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.carts.items.at(
        connection,
        {
          cartId: typia.random<string & tags.Format<"uuid">>(),
          itemId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
