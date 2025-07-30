import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";

/**
 * Validate error handling for not found: admin queries a non-existent behavior
 * tracking event for a customer.
 *
 * Ensures that when an administrator (with valid credentials) requests a
 * behavioral event with a random/unknown behaviorTrackingId (and customerId),
 * the API returns an error (e.g., 404 not found), does not leak business data,
 * and responds with a correct error structure. This simulates the negative (not
 * found) retrieval scenario for audit/logging endpoints.
 *
 * Steps:
 *
 * 1. Provision a new admin account for valid authentication context.
 * 2. Generate random UUIDs for both customerId and behaviorTrackingId, which are
 *    not present in the system.
 * 3. Attempt the lookup with
 *    api.functional.aimall_backend.administrator.customers.behaviorTrackings.at.
 * 4. Assert that the call throws (error is raised), indicating not found (404 or
 *    equivalent).
 * 5. Validate that no business data is returned, and that the error contains no
 *    information leakage.
 */
export async function test_api_aimall_backend_administrator_customers_behaviorTrackings_test_admin_get_behavior_tracking_record_not_found(
  connection: api.IConnection,
) {
  // 1. Provision a new administrator account
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string>(),
          name: typia.random<string>(),
          status: "active",
        },
      },
    );
  typia.assert(admin);

  // 2. Generate random (definitely non-existent) IDs for customer & event
  const fakeCustomerId = typia.random<string & tags.Format<"uuid">>();
  const fakeBehaviorTrackingId = typia.random<string & tags.Format<"uuid">>();

  // 3 & 4. Attempt to fetch and expect an error (not found)
  await TestValidator.error(
    "Should return not found error for missing behavior tracking record",
  )(async () => {
    await api.functional.aimall_backend.administrator.customers.behaviorTrackings.at(
      connection,
      {
        customerId: fakeCustomerId,
        behaviorTrackingId: fakeBehaviorTrackingId,
      },
    );
  });

  // 5. No further assertions; framework prohibits checking error payload details, only error occurrence is asserted.
}
