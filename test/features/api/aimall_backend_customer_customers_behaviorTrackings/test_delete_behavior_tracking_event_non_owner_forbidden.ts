import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";

/**
 * E2E test: non-owner is forbidden from deleting another customer's behavioral
 * tracking event.
 *
 * Validates that access control is strictly enforced, preventing any customer
 * from deleting another's behavioral tracking record via the API. Only the
 * event owner or appropriate administrators should have this privilege. This
 * test mimics two regular customers:
 *
 * 1. Register the event owner customer
 * 2. Register a second, non-owner customer
 * 3. As owner, create a behavior tracking event (for owner's customerId)
 * 4. Attempt to delete the event as the non-owner (should yield a forbidden error)
 *
 * The test does not cover admin-privileged deletions, only customer-to-customer
 * access control. It confirms that the API prevents privilege escalation or
 * resource abuse across customer boundaries.
 */
export async function test_api_aimall_backend_customer_customers_behaviorTrackings_test_delete_behavior_tracking_event_non_owner_forbidden(
  connection: api.IConnection,
) {
  // 1. Register the owner customer
  const owner = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        status: "active",
        password_hash: null,
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(owner);

  // 2. Register a second, non-owner customer
  const nonOwner = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        status: "active",
        password_hash: null,
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(nonOwner);

  // 3. As the event owner, create a behavioral tracking event
  const event =
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.create(
      connection,
      {
        customerId: owner.id,
        body: {
          event_type: "login",
          event_data: "{}",
          occurred_at: new Date().toISOString() as string &
            tags.Format<"date-time">,
        } satisfies IAIMallBackendBehaviorTracking.ICreate,
      },
    );
  typia.assert(event);

  // 4. Attempt to delete the event as the non-owner customer — expect forbidden error
  await TestValidator.error(
    "forbidden: non-owner cannot erase others' behavioral events",
  )(() =>
    api.functional.aimall_backend.customer.customers.behaviorTrackings.erase(
      connection,
      {
        customerId: nonOwner.id,
        behaviorTrackingId: event.id,
      },
    ),
  );
}
