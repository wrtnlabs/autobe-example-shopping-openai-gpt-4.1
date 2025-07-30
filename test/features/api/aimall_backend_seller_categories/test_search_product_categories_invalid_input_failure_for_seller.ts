import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";
import type { IPageIAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate input validation and error handling of the seller category advanced
 * search endpoint.
 *
 * This test verifies that, when called with invalid input—such as a malformed
 * parent_id (not a UUID), an invalid value for depth (e.g., a string or a
 * negative number), or incorrect pagination (e.g., page=0 or limit=200 which
 * violates constraints)—the endpoint returns validation (HTTP 422) errors and
 * does not return actual data.
 *
 * Process:
 *
 * 1. Attempt to search with a malformed parent_id (e.g., not a UUID)
 * 2. Attempt to search with an invalid depth (e.g., string or negative)
 * 3. Attempt to search with an invalid page (e.g., page=0)
 * 4. Attempt to search with an invalid limit (e.g., limit=200)
 * 5. For each case, verify an error is raised and no data is returned
 */
export async function test_api_aimall_backend_seller_categories_test_search_product_categories_invalid_input_failure_for_seller(
  connection: api.IConnection,
) {
  // 1. Malformed parent_id (not a UUID)
  await TestValidator.error("invalid parent_id: not UUID")(async () => {
    await api.functional.aimall_backend.seller.categories.search(connection, {
      body: {
        parent_id: "not-a-uuid",
      },
    });
  });

  // 2. Invalid depth (negative value)
  await TestValidator.error("invalid depth: negative value")(async () => {
    await api.functional.aimall_backend.seller.categories.search(connection, {
      body: {
        depth: -1,
      },
    });
  });

  // 3. Invalid page (page < 1)
  await TestValidator.error("invalid page: page=0")(async () => {
    await api.functional.aimall_backend.seller.categories.search(connection, {
      body: {
        page: 0,
      },
    });
  });

  // 4. Invalid limit (limit > 100)
  await TestValidator.error("invalid limit: limit > 100")(async () => {
    await api.functional.aimall_backend.seller.categories.search(connection, {
      body: {
        limit: 200,
      },
    });
  });
}
