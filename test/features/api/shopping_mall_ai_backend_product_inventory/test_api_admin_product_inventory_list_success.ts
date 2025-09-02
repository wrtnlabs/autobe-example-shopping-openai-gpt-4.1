import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";
import type { IPageIShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductInventory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test that an authenticated admin can access the paginated inventory list
 * for a specific product.
 *
 * Prerequisites:
 *
 * - Admin must be registered and authenticated.
 * - Target product must exist with some inventory present (simulated by using
 *   a random product UUID for demonstration if no explicit creation API is
 *   given).
 *
 * Steps:
 *
 * 1. Create and authenticate an admin via api.functional.auth.admin.join,
 *    using randomized data appropriate for
 *    IShoppingMallAiBackendAdmin.ICreate.
 * 2. Generate or fetch a target productId with assumed inventories (use
 *    typia.random<string & tags.Format<"uuid">>()).
 * 3. Compose valid search and pagination parameters (e.g., limit, page,
 *    sorting).
 * 4. Call
 *    api.functional.shoppingMallAiBackend.admin.products.inventories.index,
 *    passing the productId and the composed IRequest body.
 * 5. Assert that the response matches the
 *    IPageIShoppingMallAiBackendProductInventory and that the returned data
 *    corresponds to the requested productId.
 */
export async function test_api_admin_product_inventory_list_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminJoinInput = {
    username: RandomGenerator.alphabets(8),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email:
      `${RandomGenerator.alphabets(6)}@${RandomGenerator.alphabets(5)}.com` as string &
        tags.Format<"email">,
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinInput });
  typia.assert(adminAuth);

  // 2. Simulate or fetch a target productId (using random UUID in absence of product creation endpoint)
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Compose paginated query parameters (testing mid-page, e.g. page 2, limit 5, with sorting)
  const requestBody: IShoppingMallAiBackendProductInventory.IRequest = {
    page: 2,
    limit: 5,
    sort: "desc",
    order_by: "last_update_at",
  };

  // 4. Call inventory list API
  const output: IPageIShoppingMallAiBackendProductInventory =
    await api.functional.shoppingMallAiBackend.admin.products.inventories.index(
      connection,
      {
        productId,
        body: requestBody,
      },
    );
  typia.assert(output);

  // 5. Validate output pagination metadata and types
  TestValidator.equals(
    "pagination page should match request",
    output.pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "pagination limit should match request",
    output.pagination.limit,
    requestBody.limit,
  );
  TestValidator.predicate(
    "all inventory records should correspond to the given productId",
    output.data.every(
      (inv) => inv.shopping_mall_ai_backend_products_id === productId,
    ),
  );
}
