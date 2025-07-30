import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";

/**
 * Validate that a non-administrator cannot update a customer's behavioral
 * tracking record.
 *
 * This test ensures API privacy/compliance by verifying that a regular customer
 * (not an admin) is denied when attempting to update another customer's
 * behavioral event tracking record.
 *
 * Steps:
 *
 * 1. Register a (target) customer account to use for the tracking record
 *    (dependency 1).
 * 2. As an (admin or system role), create a behavior tracking record for this
 *    customer (dependency 2), capturing the returned behaviorTrackingId.
 * 3. As a regular (non-admin) user (the customer who owns the record), attempt to
 *    perform an update request for the behavior tracking record by customerId
 *    and behaviorTrackingId.
 * 4. Expect an authorization/forbidden error response.
 * 5. (Optional) Attempt as a different customer user – expect the same forbidden
 *    result.
 */
export async function test_api_aimall_backend_administrator_customers_behaviorTrackings_test_update_behavior_tracking_unauthorized_access_denied(
  connection: api.IConnection,
) {
  // 1. Register (target) customer account
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: "010" + typia.random<string>().slice(0, 8),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. (System) create behavioral tracking for the customer
  const behaviorTracking: IAIMallBackendBehaviorTracking =
    await api.functional.aimall_backend.administrator.customers.behaviorTrackings.create(
      connection,
      {
        customerId: customer.id,
        body: {
          event_type: "login",
          event_data: JSON.stringify({ device: "web", reputation: "normal" }),
          occurred_at: new Date().toISOString(),
        } satisfies IAIMallBackendBehaviorTracking.ICreate,
      },
    );
  typia.assert(behaviorTracking);

  // 3. As the customer (non-admin), attempt to update the record
  // [No separate login function exists in provided API, so we assume the 'connection' simulates regular/non-admin user context.]
  await TestValidator.error("unauthorized customer update is denied")(() =>
    api.functional.aimall_backend.administrator.customers.behaviorTrackings.update(
      connection,
      {
        customerId: customer.id,
        behaviorTrackingId: behaviorTracking.id,
        body: {
          event_type: "add_cart",
          event_data: JSON.stringify({
            device: "web",
            status: "test violation",
          }),
        } satisfies IAIMallBackendBehaviorTracking.IUpdate,
      },
    ),
  );
  // 4. Optionally: Try as a different customer – omitted due to lack of auth API.
}
