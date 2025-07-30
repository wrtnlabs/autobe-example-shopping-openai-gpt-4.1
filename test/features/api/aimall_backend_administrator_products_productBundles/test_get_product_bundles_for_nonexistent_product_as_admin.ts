import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendProductBundle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductBundle";

/**
 * Verify that attempting to list product bundles for a non-existent product ID
 * as an administrator returns a not found error (404).
 *
 * Business context:
 *
 * - This endpoint allows administrators to retrieve all product bundles
 *   associated with a particular product.
 * - It is important that the endpoint responds correctly, both for existing and
 *   non-existent products.
 *
 * Step-by-step process:
 *
 * 1. Generate a random UUID for a productId that does not exist in the system (no
 *    setup required since the focus is negative testing).
 * 2. Attempt to call the API to list product bundles for this non-existent
 *    productId via the admin endpoint.
 * 3. Confirm that the API responds with a not found error (HTTP 404), verifying
 *    correct error handling for invalid product references.
 * 4. (No clean-up necessary; this is a negative test that does not alter state.)
 */
export async function test_api_aimall_backend_administrator_products_productBundles_index_get_product_bundles_for_nonexistent_product_as_admin(
  connection: api.IConnection,
) {
  // 1. Generate a random (presumably non-existent) productId (uuid)
  const nonExistentProductId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Attempt to fetch product bundles for the non-existent productId
  await TestValidator.error("should throw not found for non-existent product")(
    async () => {
      await api.functional.aimall_backend.administrator.products.productBundles.index(
        connection,
        {
          productId: nonExistentProductId,
        },
      );
    },
  );
}
