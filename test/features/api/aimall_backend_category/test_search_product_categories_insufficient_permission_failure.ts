import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";
import type { IPageIAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test: Category search with insufficient permissions (failure scenario)
 *
 * This test verifies that the category search endpoint, when accessed by a
 * customer who is either unprivileged (with an expired/invalid token, or with
 * inappropriate/restricted status), responds with correct error (permission
 * denied/forbidden) or limits results according to business and privacy rules.
 *
 * Business scenario:
 *
 * 1. Simulate a customer connection with insufficient credentials (e.g., expired
 *    access token, malformed, or status revoked/blocked).
 * 2. Attempt to perform an advanced category search (with optional search
 *    filters/pagination) via the PATCH /aimall-backend/customer/categories
 *    endpoint.
 * 3. Validate that the API either rejects the request with an error (e.g., 403
 *    Forbidden, 401 Unauthorized) or, if not an outright error, does not return
 *    results that violate privacy/business rules.
 * 4. Confirm via error expectation that insufficient permissions cannot retrieve
 *    protected or unrestricted category data.
 *
 * Steps:
 *
 * 1. Prepare a category search request body (deep search/filter criteria is
 *    optional here, as the focus is on permission handling).
 * 2. Connect using a purposely invalid/insufficient customer connection or
 *    simulate a revoked/blocked user.
 * 3. Attempt category search and assert that access is denied using
 *    TestValidator.error.
 */
export async function test_api_aimall_backend_category_test_search_product_categories_insufficient_permission_failure(
  connection: api.IConnection,
) {
  // Step 1: Prepare advanced search/filter criteria for categories (content doesn't matter for permission test)
  const requestBody = typia.random<IAimallBackendCategory.IRequest>();

  // Step 2: Simulate insufficient permission - forcibly set an invalid or expired token
  connection.headers = {
    ...connection.headers,
    Authorization: "Bearer invalid-or-expired-token",
  };

  // Step 3: Attempt category search and expect a permission error
  await TestValidator.error("insufficient permission triggers access denial")(
    () =>
      api.functional.aimall_backend.customer.categories.search(connection, {
        body: requestBody,
      }),
  );
}
