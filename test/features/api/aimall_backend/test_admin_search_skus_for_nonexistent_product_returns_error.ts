import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";
import type { IPageIAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSku";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Attempt to search for SKUs of a nonexistent productId as an administrator and
 * validate error handling.
 *
 * This test verifies that searching SKUs (Stock Keeping Units) for a productId
 * that does not exist, using the PATCH
 * /aimall-backend/administrator/products/{productId}/skus endpoint as an
 * administrator, results in an appropriate error (such as 404 Not Found). This
 * checks both business logic and robust error handling for invalid filter
 * contexts, ensuring the backend does not leak or accept nonexistent product
 * resources for SKU lists.
 *
 * Steps:
 *
 * 1. Generate a random UUID for a productId that (statistically) does not exist in
 *    the system.
 * 2. Construct a valid SKU search request using that productId as the filter.
 * 3. Call the administrator SKU search API and assert that an error (404 or
 *    similar) is returned.
 */
export async function test_api_aimall_backend_test_admin_search_skus_for_nonexistent_product_returns_error(
  connection: api.IConnection,
) {
  // 1. Generate a random, presumably nonexistent, productId
  const nonexistentProductId = typia.random<string & tags.Format<"uuid">>();

  // 2. Build a minimal, valid request body (just filter by the nonexistent productId)
  const requestBody: IAimallBackendSku.IRequest = {
    product_id: nonexistentProductId,
  };

  // 3. Attempt to search SKUs for this nonexistent productId, expect a 404 Not Found (or similar error)
  await TestValidator.error(
    "should return error for nonexistent productId in SKU search",
  )(async () => {
    await api.functional.aimall_backend.administrator.products.skus.search(
      connection,
      {
        productId: nonexistentProductId,
        body: requestBody,
      },
    );
  });
}
