import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";
import type { IPageIShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductInventory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_product_inventory_list_failure_nonexistent_product(
  connection: api.IConnection,
) {
  /**
   * Validates failure case when an authenticated admin tries to list
   * inventories for a non-existent productId.
   *
   * Steps:
   *
   * 1. Register and authenticate as a new admin using /auth/admin/join, which
   *    supplies tokens.
   * 2. Attempt to list inventories for a random, non-existent productId (random
   *    UUID not assigned to any product) using PATCH
   *    /shoppingMallAiBackend/admin/products/{productId}/inventories.
   * 3. If API throws a not found (404) or bad request (400) error, confirm the
   *    status via TestValidator.predicate.
   * 4. If API responds with success (200) and a paginated payload, assert that the
   *    returned "data" array is empty, and that the pagination field structure
   *    is present and valid.
   *
   * This ensures robust handling of queries for missing products, and that the
   * endpoint returns expected errors or an empty result set as per business/API
   * design.
   */
  // 1. Register and authenticate new admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(10)}@test.admin.com`,
      phone_number: null,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Attempt to list inventories for a random, non-existent productId
  let result: IPageIShoppingMallAiBackendProductInventory | null = null;
  let errorCaught = false;
  const nonExistentProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  try {
    result =
      await api.functional.shoppingMallAiBackend.admin.products.inventories.index(
        connection,
        {
          productId: nonExistentProductId,
          body: {},
        },
      );
    typia.assert(result);
  } catch (error) {
    errorCaught = true;
    TestValidator.predicate(
      "listing inventories for non-existent product yields 404 or 400",
      error instanceof api.HttpError &&
        (error.status === 404 || error.status === 400),
    );
  }

  // 3. If no error, assert result is a valid page structure with empty data array
  if (!errorCaught) {
    TestValidator.equals(
      "data should be empty array for non-existent product",
      result?.data,
      [],
    );
    TestValidator.predicate(
      "pagination info should exist and have current page",
      !!result?.pagination && typeof result.pagination.current === "number",
    );
  }
}
