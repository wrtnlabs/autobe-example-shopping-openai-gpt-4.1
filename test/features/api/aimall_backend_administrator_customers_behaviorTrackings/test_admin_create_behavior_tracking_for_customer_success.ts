import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";

/**
 * Validate that an administrator can create a behavior tracking event for any
 * customer (for compliance, log correction, etc).
 *
 * Business context: This test ensures that an administrator can
 * programmatically add a behavior tracking record for any customer. Typical use
 * cases include compliance backfilling, log corrections, or administrative
 * investigations. The ability to attribute new events to existing customers is
 * critical for audit and correction workflows.
 *
 * End-to-end scenario:
 *
 * 1. Register a new customer (to serve as event target)
 * 2. Register/onboard an administrator (so privileged endpoint can be called)
 * 3. Submit a behavior event, as admin, for the customer
 * 4. Assert the record is properly created and linked to the target customer
 *
 * Edge cases and failure/permission checks are not explored (scenario is a
 * "happy path" success test, not a security/permission boundary test).
 */
export async function test_api_aimall_backend_administrator_customers_behaviorTrackings_test_admin_create_behavior_tracking_for_customer_success(
  connection: api.IConnection,
) {
  // 1. Register a new customer to be the logging subject
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: RandomGenerator.alphabets(10) + "@autobe-e2e.com",
        phone:
          "010" +
          ArrayUtil.repeat(8)(() =>
            String(Math.floor(Math.random() * 10)),
          ).join(""),
        password_hash: RandomGenerator.alphabets(32),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Register/onboard an administrator account
  const admin: IAimallBackendAdministrator =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: RandomGenerator.alphabets(12) + "@aimall-admin.com",
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IAimallBackendAdministrator.ICreate,
      },
    );
  typia.assert(admin);

  // 3. Create a behavior tracking event for the customer (as admin)
  const eventInput: IAIMallBackendBehaviorTracking.ICreate = {
    event_type: "login",
    event_data: JSON.stringify({ ip: "192.168.0.1", device: "chrome" }),
    occurred_at: new Date().toISOString(),
  };
  const tracking: IAIMallBackendBehaviorTracking =
    await api.functional.aimall_backend.administrator.customers.behaviorTrackings.create(
      connection,
      {
        customerId: customer.id,
        body: eventInput,
      },
    );
  typia.assert(tracking);

  // 4. Assert that the behavior tracking is correctly associated
  TestValidator.equals("behavior tracking registered for correct customer")(
    tracking.customer_id,
  )(customer.id);
  TestValidator.equals("event type matches")(tracking.event_type)(
    eventInput.event_type,
  );
  TestValidator.equals("event data matches")(tracking.event_data)(
    eventInput.event_data,
  );
}
