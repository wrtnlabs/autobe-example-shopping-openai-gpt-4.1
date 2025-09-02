import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";

export async function test_api_seller_favorite_detail_not_found(
  connection: api.IConnection,
) {
  /**
   * Test error handling when retrieving seller favorite details by non-existent
   * or unrelated favoriteId.
   *
   * Steps:
   *
   * 1. Register a new seller (generates a unique business account and obtains JWT
   *    authentication).
   * 2. Attempt to fetch details of a favorite with a random UUID that is highly
   *    unlikely to exist in the system or belong to this seller.
   * 3. Assert that the API throws an error (such as not found or forbidden),
   *    indicating resource absence or access denial.
   *
   * This validates correct behavior for missing/unauthorized favorites and
   * protects against data leakage.
   */

  // 1. Register a seller and obtain authentication
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerAuth);
  TestValidator.predicate(
    "seller account created and authorized",
    !!sellerAuth.seller &&
      !!sellerAuth.token &&
      typeof sellerAuth.token.access === "string" &&
      sellerAuth.token.access.length > 0,
  );

  // 2. Attempt to access a favorite with a random non-existent or unrelated UUID
  await TestValidator.error(
    "retrieving non-existent or unauthorized seller favorite returns error",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.favorites.at(
        connection,
        {
          favoriteId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
