import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";
import type { IPageIAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAIMallBackendBehaviorTracking";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test error handling when searching behavior tracking events with a
 * non-existent customerId as admin.
 *
 * This test validates that the PATCH endpoint
 * `/aimall-backend/administrator/customers/{customerId}/behaviorTrackings`
 * correctly returns an error (such as 404 Not Found) when provided an invalid
 * or non-existent customerId. It also confirms that no data is returned for
 * requests with invalid customer ids and that error details are present.
 *
 * Test steps:
 *
 * 1. Generate a random UUID that is exceedingly unlikely to correspond to any real
 *    customer (to simulate a non-existent customerId).
 * 2. Construct a minimal, valid request body for
 *    IAIMallBackendBehaviorTracking.IRequest (can be empty or very generic
 *    since main test is for authorization/existence handling, not filtering
 *    logic).
 * 3. As an admin, attempt to PATCH search using the non-existent customerId and
 *    the request body.
 * 4. Catch expected error (404 or relevant not-found error). Confirm that:
 *
 *    - An error occurs (i.e., no success response)
 *    - Error details or status code indicate resource was not found or is otherwise
 *         invalid.
 *    - No data from the API for the invalid customerId.
 * 5. If the search for non-existent id unexpectedly succeeds, fail the test with a
 *    message indicating this is not expected.
 */
export async function test_api_aimall_backend_test_admin_search_behavior_trackings_invalid_customer_id(
  connection: api.IConnection,
) {
  // Step 1: Generate a UUID that is very unlikely to exist as a customer ID
  const nonExistentCustomerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 2: Minimal valid request body for filtering (optional fields; here, left empty to guarantee validity)
  const requestBody: IAIMallBackendBehaviorTracking.IRequest = {};

  // Step 3–5: Attempt the PATCH search and confirm error occurs
  await TestValidator.error(
    "Should return not found or similar error when searching with invalid customerId",
  )(async () => {
    await api.functional.aimall_backend.administrator.customers.behaviorTrackings.search(
      connection,
      {
        customerId: nonExistentCustomerId,
        body: requestBody,
      },
    );
  });
}
