import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";

/**
 * Validate customer behavior tracking record update flow.
 *
 * This E2E test verifies that a customer can update their own behavior tracking
 * event record. The test simulates correcting a misclassified event type or
 * updating event payload data on a previously logged event, ensuring the record
 * stays correctly linked to the same customer.
 *
 * Business workflow:
 *
 * 1. Register a new customer (acting as event owner).
 * 2. Log a new behavior event for the customer (e.g., product view).
 * 3. Update the behavior tracking event's type and payload (simulate event
 *    correction).
 * 4. Assert that (a) updated content is reflected, and (b) customer association
 *    remains unchanged.
 */
export async function test_api_aimall_backend_customer_customers_behaviorTrackings_test_customer_update_behavior_tracking_record_success(
  connection: api.IConnection,
) {
  // 1. Register a customer to own the behavior records
  const customerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
    password_hash: typia.random<string>(), // Simulate backend hash storage - not user password
    status: "active",
  } satisfies IAimallBackendCustomer.ICreate;
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerInput },
  );
  typia.assert(customer);

  // 2. Log a new behavior event (e.g., view product) for this customer
  const behaviorEventInput = {
    event_type: "view_product",
    event_data: JSON.stringify({ productId: "prod-123", action: "view" }),
    occurred_at: new Date().toISOString() as string & tags.Format<"date-time">,
  } satisfies IAIMallBackendBehaviorTracking.ICreate;
  const event =
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.create(
      connection,
      {
        customerId: customer.id,
        body: behaviorEventInput,
      },
    );
  typia.assert(event);

  // 3. Update the behavior tracking event: new event_type and payload
  const updateInput = {
    event_type: "add_cart",
    event_data: JSON.stringify({
      productId: "prod-123",
      action: "add_cart",
      quantity: 5,
    }),
  } satisfies IAIMallBackendBehaviorTracking.IUpdate;
  const updated =
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.update(
      connection,
      {
        customerId: customer.id,
        behaviorTrackingId: event.id,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 4. Validate update effects
  TestValidator.equals("customer_id unchanged")(updated.customer_id)(
    customer.id,
  );
  TestValidator.equals("event_type updated")(updated.event_type)(
    updateInput.event_type,
  );
  TestValidator.equals("event_data updated")(updated.event_data)(
    updateInput.event_data,
  );
}
