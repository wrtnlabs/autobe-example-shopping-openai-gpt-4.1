import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";

/**
 * Validate that a customer cannot update another user's behavioral tracking
 * record.
 *
 * Business context:
 *
 * - Each behavior tracking record is attached to exactly one customer (owner).
 * - Only the record owner or privileged parties may update behavioral tracking
 *   events.
 *
 * Test sequence:
 *
 * 1. Register first customer; obtain customer id.
 * 2. Log a behavior tracking event under the first customer; obtain record id.
 * 3. Register a second customer (distinct from the first).
 * 4. Attempt to update the first customer's behavioral tracking record while
 *    acting as the second customer (simulated via new customerTwo context).
 * 5. Confirm the update is blocked with an error (e.g., forbidden/unauthorized).
 *
 * Success criteria:
 *
 * - The API rejects the operation with an appropriate error response.
 * - No type or protocol errors at runtime.
 */
export async function test_api_aimall_backend_customer_customers_behaviorTrackings_test_customer_update_behavior_tracking_not_owner_fails(
  connection: api.IConnection,
) {
  // 1. Register the first customer (owner)
  const customerOneEmail = typia.random<string & tags.Format<"email">>();
  const customerOnePhone = RandomGenerator.mobile();
  const customerOne: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customerOneEmail,
        phone: customerOnePhone,
        status: "active",
        password_hash: null,
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customerOne);

  // 2. Log a behavioral event for the first customer
  const behaviorEvent: IAIMallBackendBehaviorTracking =
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.create(
      connection,
      {
        customerId: customerOne.id,
        body: {
          event_type: "login",
          event_data: JSON.stringify({ ip: "192.168.0.1", result: "success" }),
          occurred_at: new Date().toISOString(),
        } satisfies IAIMallBackendBehaviorTracking.ICreate,
      },
    );
  typia.assert(behaviorEvent);

  // 3. Register the second customer (would-be attacker)
  const customerTwoEmail = typia.random<string & tags.Format<"email">>();
  const customerTwoPhone = RandomGenerator.mobile();
  const customerTwo: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customerTwoEmail,
        phone: customerTwoPhone,
        status: "active",
        password_hash: null,
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customerTwo);

  // 4. Try to update first customer's behavior event as the second customer
  await TestValidator.error(
    "Second customer cannot update first customer's behavioral record",
  )(async () => {
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.update(
      connection,
      {
        customerId: customerTwo.id,
        behaviorTrackingId: behaviorEvent.id,
        body: {
          event_type: "view_product",
        } satisfies IAIMallBackendBehaviorTracking.IUpdate,
      },
    );
  });
}
