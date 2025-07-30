import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendProductOption";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductOption";

/**
 * Validate API returns an error when retrieving product options for
 * non-existent productId.
 *
 * This test ensures that the product options list endpoint properly handles the
 * case where the provided productId does not correspond to any existing product
 * in the system. It validates that the API responds with a 404 Not Found error,
 * indicating nothing can be retrieved for a non-existent product.
 *
 * Workflow Steps:
 *
 * 1. Generate a random UUID value for productId that is not used by any existing
 *    product.
 * 2. Attempt to fetch the list of product options for this non-existent productId
 *    using the API.
 * 3. Validate that the API throws a 404 Not Found error.
 * 4. Confirm that no product option data is returned.
 */
export async function test_api_aimall_backend_products_productOptions_test_list_product_options_for_nonexistent_product(
  connection: api.IConnection,
) {
  // 1. Generate a UUID for a non-existent product.
  const invalidProductId = typia.random<string & tags.Format<"uuid">>();

  // 2. Try to fetch the product options for the invalid productId and expect a 404 error
  await TestValidator.error("should return 404 for non-existent productId")(
    async () => {
      await api.functional.aimall_backend.products.productOptions.index(
        connection,
        {
          productId: invalidProductId,
        },
      );
    },
  );
}
