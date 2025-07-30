import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";
import type { IPageIAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate API rejects malformed or invalid search/filter queries for product
 * categories as a customer.
 *
 * This function tests that when clients provide bad input (e.g., non-UUID
 * parent_id, negative/zero depth, pagination outside allowed bounds), the API
 * responds with proper validation errors and does not process the query.
 *
 * Steps:
 *
 * 1. Attempt search with a non-UUID parent_id – expect validation error
 * 2. Attempt search with invalid depth (zero or negative) – expect validation
 *    error
 * 3. Attempt search with invalid pagination (page < 1, limit < 1, limit > 100) –
 *    expect validation error
 * 4. Ensure all error cases throw and are caught by TestValidator.error
 */
export async function test_api_aimall_backend_customer_categories_test_search_product_categories_invalid_filter_failure(
  connection: api.IConnection,
) {
  // 1. Invalid parent_id (not a UUID)
  await TestValidator.error("invalid parent_id - format")(() =>
    api.functional.aimall_backend.customer.categories.search(connection, {
      body: {
        parent_id: "not-a-uuid-format",
      },
    }),
  );

  // 2. Invalid depth (zero)
  await TestValidator.error("invalid depth - zero")(() =>
    api.functional.aimall_backend.customer.categories.search(connection, {
      body: {
        depth: 0,
      },
    }),
  );
  // 2b. Invalid depth (negative)
  await TestValidator.error("invalid depth - negative")(() =>
    api.functional.aimall_backend.customer.categories.search(connection, {
      body: {
        depth: -5,
      },
    }),
  );

  // 3. Invalid pagination: page < 1
  await TestValidator.error("invalid page - less than 1")(() =>
    api.functional.aimall_backend.customer.categories.search(connection, {
      body: {
        page: 0,
      },
    }),
  );
  // 3b. Invalid pagination: limit < 1
  await TestValidator.error("invalid limit - less than 1")(() =>
    api.functional.aimall_backend.customer.categories.search(connection, {
      body: {
        limit: 0,
      },
    }),
  );
  // 3c. Invalid pagination: limit > 100
  await TestValidator.error("invalid limit - greater than 100")(() =>
    api.functional.aimall_backend.customer.categories.search(connection, {
      body: {
        limit: 101,
      },
    }),
  );
}
