import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategoryMapping";
import type { IPageIShoppingMallAiBackendProductCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductCategoryMapping";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that searching for product-category mappings with unmatched
 * filters returns an empty result set.
 *
 * 1. Register and authenticate as an admin user to obtain admin-level access
 *    token (via /auth/admin/join).
 * 2. Call PATCH /shoppingMallAiBackend/admin/productCategoryMappings, sending
 *    a filter body with deliberately unmatched uuid values for
 *    shopping_mall_ai_backend_products_id and
 *    shopping_mall_ai_backend_product_categories_id.
 * 3. Assert that the response is a valid
 *    IPageIShoppingMallAiBackendProductCategoryMapping object.
 * 4. Assert that output.data is an empty array and pagination.records is zero.
 * 5. Assert that no error or malformed response is returned.
 */
export async function test_api_product_category_mapping_index_filter_no_results(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin
  const randomAdminCreate: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(12),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: null,
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: randomAdminCreate,
  });
  typia.assert(adminAuth);

  // 2. Issue a search with deliberately unmatched filter values
  const requestBody: IShoppingMallAiBackendProductCategoryMapping.IRequest = {
    shopping_mall_ai_backend_products_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    shopping_mall_ai_backend_product_categories_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    page: 1,
    limit: 10,
  };
  const output =
    await api.functional.shoppingMallAiBackend.admin.productCategoryMappings.index(
      connection,
      { body: requestBody },
    );
  typia.assert(output);

  // 3. Assert output is empty, correct pagination (zero records)
  TestValidator.equals(
    "zero mappings returned for unmatched filters",
    output.data,
    [],
  );
  TestValidator.equals(
    "zero records in pagination for unmatched filters",
    output.pagination.records,
    0,
  );
  TestValidator.predicate(
    "pagination.current is 1 for unmatched zero-results",
    output.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination.limit matches requested value",
    output.pagination.limit === requestBody.limit,
  );
  TestValidator.predicate(
    "pagination.pages is 0 when no records",
    output.pagination.pages === 0,
  );
}
