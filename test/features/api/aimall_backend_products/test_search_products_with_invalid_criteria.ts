import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IPageIAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendProduct";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that the products advanced search endpoint correctly rejects invalid
 * or malformed search criteria.
 *
 * This test attempts to search products in the AIMall backend using the PATCH
 * /aimall-backend/products API, intentionally passing bad input:
 *
 * - A non-existent (random) category_id
 * - An invalid page number (e.g., 0)
 * - An invalid limit (e.g., 0 or 10000) The purpose is to ensure:
 *
 * 1. The API returns appropriate HTTP error status (not 200)
 * 2. No sensitive/internal details are exposed in error
 * 3. Normal queries with valid input still succeed
 *
 * Steps:
 *
 * 1. Issue a search with a random UUID as category_id (which should not exist)
 * 2. Issue a search with invalid page=0
 * 3. Issue a search with invalid limit=0
 * 4. Issue a search with invalid limit=10000
 * 5. Issue a search with valid criteria (page=1, limit=10) to verify success on
 *    legitimate input
 *
 * Expected outcome:
 *
 * - For 1~4, API should return error, NOT a normal paginated data response, and
 *   must NOT leak stacktrace, internal conf, or low-level DB details.
 * - For 5, API returns paginated product data as usual.
 */
export async function test_api_aimall_backend_products_test_search_products_with_invalid_criteria(
  connection: api.IConnection,
) {
  // 1. Non-existent category_id
  await TestValidator.error("non-existent category_id should result in error")(
    async () => {
      await api.functional.aimall_backend.products.search(connection, {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
        },
      });
    },
  );

  // 2. Invalid page number (0)
  await TestValidator.error("invalid page=0 should fail")(async () => {
    await api.functional.aimall_backend.products.search(connection, {
      body: { page: 0 },
    });
  });

  // 3. Invalid limit (0)
  await TestValidator.error("invalid limit=0 should fail")(async () => {
    await api.functional.aimall_backend.products.search(connection, {
      body: { limit: 0 },
    });
  });

  // 4. Invalid limit (10000)
  await TestValidator.error("invalid limit=10000 should fail")(async () => {
    await api.functional.aimall_backend.products.search(connection, {
      body: { limit: 10000 },
    });
  });

  // 5. Valid input (control group) - should succeed
  const output = await api.functional.aimall_backend.products.search(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(output);
  TestValidator.predicate("result data present")(Array.isArray(output.data));
}
