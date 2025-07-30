import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSku";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Validates error handling when attempting to list SKUs for a non-existent
 * product.
 *
 * This test checks API robustness by requesting the SKU listing endpoint for a
 * product UUID that is not present in the system database. It expects the API
 * to reject the request with an error, such as a 404 Not Found. This ensures
 * that the endpoint does not quietly return empty or misleading data but
 * provides correct error signaling when products are missing. Such behavior is
 * critical for clients to handle application flows and user feedback.
 *
 * Steps:
 *
 * 1. Generate a random productId (UUID) that is highly unlikely to exist in the
 *    database.
 * 2. Attempt to call the SKU list API for this non-existent productId.
 * 3. Verify that an error (e.g. HttpError 404) is thrown and properly handled.
 * 4. Confirm no data is erroneously returned for the request.
 */
export async function test_api_aimall_backend_administrator_products_skus_test_list_skus_for_nonexistent_product_returns_error(
  connection: api.IConnection,
) {
  // 1. Generate a random productId, unlikely to exist
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to list SKUs for this nonexistent product
  await TestValidator.error(
    "listing SKUs for non-existent product should fail",
  )(async () => {
    await api.functional.aimall_backend.administrator.products.skus.index(
      connection,
      { productId: nonExistentProductId },
    );
  });
}
