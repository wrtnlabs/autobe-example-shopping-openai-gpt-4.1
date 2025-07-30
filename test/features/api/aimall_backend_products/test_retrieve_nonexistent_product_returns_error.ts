import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * Validate error handling for requests to nonexistent products.
 *
 * This test verifies the /aimall-backend/products/{productId} endpoint
 * correctly returns an error (ideally 404 Not Found) when a client requests a
 * product that does not exist.
 *
 * This is a negative test case: the absence of data is expected and the system
 * should not leak any sensitive or internal technical information in the
 * response.
 *
 * Steps:
 *
 * 1. Generate a UUID that is extremely unlikely to exist (simulate a nonexistent
 *    product).
 * 2. Attempt to fetch the product by this UUID.
 * 3. Assert that an error is thrown (ambiguous error type, but must NOT return a
 *    product).
 *
 * Notes:
 *
 * - Any error is acceptable so long as a product is not returned (ideally 404/not
 *   found).
 * - Do not analyze error message or structure—only that an error is thrown.
 * - Should NOT leak backend internals or system specifics.
 */
export async function test_api_aimall_backend_products_test_retrieve_nonexistent_product_returns_error(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID (unlikely to exist in the system)
  const nonexistentProductId = typia.random<string & tags.Format<"uuid">>();

  // 2 & 3. Attempt to retrieve and assert error is thrown
  await TestValidator.error("should fail for nonexistent product ID")(
    async () => {
      await api.functional.aimall_backend.products.at(connection, {
        productId: nonexistentProductId,
      });
    },
  );
}
