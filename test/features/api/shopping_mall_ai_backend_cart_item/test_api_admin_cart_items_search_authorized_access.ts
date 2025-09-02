import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCartItem";
import type { IPageIShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCartItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E: Admin retrieves cart items with authorized access, testing positive
 * and negative cases with pagination and filters.
 *
 * Business context: This test simulates an authorized admin listing items
 * in a shopping cart. It ensures admin join/authentication works, validates
 * that cart item retrieval honors permissions, correctly paginates/filter
 * responses, and handles edge/error cases.
 *
 * Steps:
 *
 * 1. Register and authenticate an admin with required DTO fields
 *    (password_hash, etc.)
 * 2. Query a random cartId (likely empty) and verify that result is an empty
 *    array with valid pagination
 * 3. Query a (simulated) populated cartId with full pagination/filter fields
 *    filled, and validate returned array items
 *
 *    - Check correct structure, item count, and correct cart id in item objects
 * 4. Query a non-existent cartId, ensuring correct error is thrown or empty
 *    result is returned (system dependent)
 */
export async function test_api_admin_cart_items_search_authorized_access(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphabets(8),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphabets(8)}@adminmail.com` as string &
      tags.Format<"email">,
    is_active: true,
  };
  const authorized = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(authorized);
  TestValidator.predicate(
    "admin authorization object present",
    typeof authorized.admin === "object",
  );

  // 2. Query a cartId assumed to have no items (empty array edge case)
  const emptyCartId = typia.random<string & tags.Format<"uuid">>();
  const emptyRes =
    await api.functional.shoppingMallAiBackend.admin.carts.items.index(
      connection,
      {
        cartId: emptyCartId,
        body: {},
      },
    );
  typia.assert(emptyRes);
  TestValidator.predicate(
    "empty cart pagination object",
    typeof emptyRes.pagination === "object",
  );
  TestValidator.equals("empty cart should have no items", emptyRes.data, []);

  // 3. Query a simulated populated cart with filters/pagination
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const filters: IShoppingMallAiBackendCartItem.IRequest = {
    page: 1,
    limit: 10,
    quantity_min: 1,
    quantity_max: 100,
    sort_field: RandomGenerator.pick(["created_at", "quantity"] as const),
    sort_order: RandomGenerator.pick(["asc", "desc"] as const),
  };
  const page =
    await api.functional.shoppingMallAiBackend.admin.carts.items.index(
      connection,
      {
        cartId,
        body: filters,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "paginated cart result has valid pagination object",
    typeof page.pagination === "object",
  );
  TestValidator.predicate(
    "paginated cart result is array",
    Array.isArray(page.data),
  );
  for (const item of page.data) {
    typia.assert(item);
    TestValidator.equals(
      "cart item owns correct cartId",
      item.shopping_mall_ai_backend_cart_id,
      cartId,
    );
    TestValidator.predicate("cart item quantity >= 1", item.quantity >= 1);
    if (filters.quantity_max !== undefined && filters.quantity_max !== null)
      TestValidator.predicate(
        "cart item less than max",
        item.quantity <= filters.quantity_max,
      );
  }

  // 4. Edge: Use non-existent cartId, ensure backend returns error or empty
  const fakeCartId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent cartId returns error or empty",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.carts.items.index(
        connection,
        {
          cartId: fakeCartId,
          body: {},
        },
      );
    },
  );
}
