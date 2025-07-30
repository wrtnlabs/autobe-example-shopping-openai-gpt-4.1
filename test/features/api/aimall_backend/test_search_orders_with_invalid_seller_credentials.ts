import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IPageIAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that order search with invalid seller credentials fails.
 *
 * This test ensures that only authenticated sellers with proper credentials can
 * query their own orders via the search endpoint. It attempts an order search
 * without valid seller authentication (e.g., as an unauthenticated user or a
 * user lacking seller role) and verifies that an authorization/business error
 * occurs, confirming that the business rule is enforced.
 *
 * Steps:
 *
 * 1. Attempt to search for seller orders without valid seller credentials.
 * 2. Assert that the operation fails with an authorization error (no data
 *    returned; error/exception thrown).
 *
 * If the system allows, a valid seller scenario could be optionally tested
 * elsewhere. Here, we only test insufficient/invalid credentials.
 */
export async function test_api_aimall_backend_test_search_orders_with_invalid_seller_credentials(
  connection: api.IConnection,
) {
  // 1. Attempt to search seller orders without valid seller authentication
  await TestValidator.error(
    "should throw authorization error for invalid seller credentials",
  )(async () => {
    // Send a minimal/empty search query as a non-seller (unprivileged context)
    await api.functional.aimall_backend.seller.orders.search(connection, {
      body: {},
    });
  });
}
