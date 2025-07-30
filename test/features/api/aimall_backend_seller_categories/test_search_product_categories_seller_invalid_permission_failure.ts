import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";
import type { IPageIAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test that accessing the advanced category search as a seller without
 * sufficient permissions (e.g., suspended seller, invalid credentials, or
 * insufficient role) fails as expected.
 *
 * This verifies that the platform enforces proper access control for category
 * search operations exposed to sellers. Non-authorized sellers (including
 * unauthenticated requests, or roles lacking permission) are expected to be
 * rejected with an error (ideally 403/401), or—if the platform fails open—no
 * sensitive data must be returned (i.e., result must be an empty set).
 *
 * Steps:
 *
 * 1. Attempt the category search API without valid authentication, expecting an
 *    error.
 * 2. If error is not thrown, validate that the result data set is empty (no
 *    category data is exposed).
 */
export async function test_api_aimall_backend_seller_categories_test_search_product_categories_seller_invalid_permission_failure(
  connection: api.IConnection,
) {
  // 1. Attempt category search without authentication—should throw an error due to missing/invalid permissions
  await TestValidator.error(
    "unauthenticated or unauthorized sellers cannot search categories",
  )(() =>
    api.functional.aimall_backend.seller.categories.search(connection, {
      body: {}, // Minimal search filter; triggers authorization logic
    }),
  );

  // 2. As a safeguard, if the API does not error but returns a page, ensure it does not leak sensitive data
  const output = await api.functional.aimall_backend.seller.categories.search(
    connection,
    {
      body: {},
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "should return empty array when non-error for forbidden search",
  )(output.data)([]);
}
