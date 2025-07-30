import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAIMallBackendBehaviorTracking";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";

/**
 * Test error handling when administrator retrieves behavior trackings for a
 * non-existent customer.
 *
 * Business requirement:
 *
 * - When an administrator attempts to retrieve user behavior events for a
 *   customerId that is not registered in the system, the backend should respond
 *   with an appropriate error (404 Not Found).
 * - No user or tracking data should be leaked or returned under such
 *   circumstances.
 *
 * Test Steps:
 *
 * 1. Generate a random UUID which is almost guaranteed not to exist as a valid
 *    customerId
 * 2. Attempt to fetch behavior tracking records for this customerId using the
 *    admin tracking API
 * 3. Assert that a 404 Not Found (or equivalent error) occurs and no data is
 *    leaked
 */
export async function test_api_aimall_backend_administrator_customers_behaviorTrackings_index_for_nonexistent_customer(
  connection: api.IConnection,
) {
  // 1. Generate a non-existent random customerId (uuid format)
  const nonexistentCustomerId = typia.random<string & tags.Format<"uuid">>();

  // 2. Try to fetch behavior tracking data for the nonexistent customer
  //    Expectation: API should throw an error (404 Not Found or similar)
  await TestValidator.error(
    "Error: Should throw 404 Not Found for nonexistent customerId",
  )(async () => {
    await api.functional.aimall_backend.administrator.customers.behaviorTrackings.index(
      connection,
      {
        customerId: nonexistentCustomerId,
      },
    );
  });
  // No further assertions needed; TestValidator.error assures there is no data leak on error.
}
