import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";

/**
 * Validates rejection when attempting to create a behavior tracking event for a
 * non-existent customer.
 *
 * Ensures that issuing a POST to
 * /aimall-backend/administrator/customers/{customerId}/behaviorTrackings with a
 * UUID that does not correspond to any actual customer will result in an error
 * (validation failure or NotFound), as per business rules. This test confirms
 * the system prevents inadvertent creation of orphan tracking data and enforces
 * referential integrity.
 *
 * Steps:
 *
 * 1. Register a new administrator with random permissions (simulate admin
 *    context).
 * 2. Attempt to create a behavior tracking record for a UUID that is not assigned
 *    to any customer (guaranteed to be invalid).
 * 3. Confirm the API throws or rejects the request with an appropriate error.
 */
export async function test_api_aimall_backend_administrator_customers_behaviorTrackings_test_admin_create_behavior_tracking_for_nonexistent_customer_fails(
  connection: api.IConnection,
) {
  // 1. Register an administrator to acquire privileges
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string>() + "@test.com",
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IAimallBackendAdministrator.ICreate,
      },
    );
  typia.assert(admin);

  // 2. Attempt to create behavior tracking for a customerId that does not exist
  const nonExistentCustomerId = typia.random<string & tags.Format<"uuid">>();
  const behaviorEvent: IAIMallBackendBehaviorTracking.ICreate = {
    event_type: "login",
    event_data: JSON.stringify({ browser: "Chrome", os: "Windows" }),
    occurred_at: new Date().toISOString(),
  };

  // 3. Expect error
  await TestValidator.error(
    "should fail to create behavior event for nonexistent customer",
  )(async () => {
    await api.functional.aimall_backend.administrator.customers.behaviorTrackings.create(
      connection,
      {
        customerId: nonExistentCustomerId,
        body: behaviorEvent,
      },
    );
  });
}
