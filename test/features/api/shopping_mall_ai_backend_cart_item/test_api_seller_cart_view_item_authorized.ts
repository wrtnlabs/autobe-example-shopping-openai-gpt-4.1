import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCartItem";

export async function test_api_seller_cart_view_item_authorized(
  connection: api.IConnection,
) {
  /**
   * E2E test to validate retrieval of a single cart item via the seller API
   * endpoint.
   *
   * Limitations: Creation of carts and items cannot be tested as such endpoints
   * are not available. The test focuses exclusively on:
   *
   * 1. Seller registration/authentication
   * 2. Retrieving a single cart item using randomly generated UUIDs
   * 3. Type assertion for all expected fields
   * 4. Error scenarios for unrelated cartId/itemId (authorization/business rule
   *    enforcement)
   */

  // 1. Seller registration/authentication
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendSeller.ICreate;
  const sellerAuthorized = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuthorized);

  // 2. Retrieve an item using random UUIDs (due to lack of creation endpoints)
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const cartItem =
    await api.functional.shoppingMallAiBackend.seller.carts.items.at(
      connection,
      { cartId, itemId },
    );
  typia.assert(cartItem);

  // 3. Validate essential fields
  TestValidator.equals(
    "cart item ID matches the requested itemId",
    cartItem.id,
    itemId,
  );
  TestValidator.equals(
    "cart item cartId matches the requested cartId",
    cartItem.shopping_mall_ai_backend_cart_id,
    cartId,
  );

  // 4. Error scenario: retrieval with unrelated cartId
  await TestValidator.error(
    "retrieval fails for unrelated cartId",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.carts.items.at(
        connection,
        {
          cartId: typia.random<string & tags.Format<"uuid">>(),
          itemId,
        },
      );
    },
  );

  // 5. Error scenario: retrieval with unrelated itemId
  await TestValidator.error(
    "retrieval fails for unrelated itemId",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.carts.items.at(
        connection,
        {
          cartId,
          itemId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
