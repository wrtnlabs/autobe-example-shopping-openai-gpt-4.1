import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";

/**
 * Verify that a newly registered customer can retrieve details of their own
 * behavioral tracking event.
 *
 * This test ensures that:
 *
 * - A customer can register and log behavioral tracking events
 * - The customer can retrieve a specific event they have created
 * - The details returned for the event match what was submitted (event type,
 *   data, timestamp, customer_id)
 *
 * Step-by-step process:
 *
 * 1. Register a new customer (save returned id)
 * 2. Log a new behavioral tracking event for the customer (save event id and
 *    payload)
 * 3. Retrieve the behavior tracking event detail by id (for this customer)
 * 4. Assert that all fields match between the created and retrieved event
 */
export async function test_api_aimall_backend_customer_customers_behaviorTrackings_test_get_behavior_tracking_details_success_customer_access_own_record(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone: typia.random<string>(),
    status: "active",
  } satisfies IAimallBackendCustomer.ICreate;
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: customerInput,
    },
  );
  typia.assert(customer);

  // 2. Log a behavioral tracking event for this customer
  const eventInput = {
    event_type: RandomGenerator.pick([
      "login",
      "add_cart",
      "view_product",
      "checkout",
    ]),
    event_data: JSON.stringify({
      ip: "127.0.0.1",
      note: RandomGenerator.paragraph()(),
    }),
    occurred_at: new Date().toISOString(),
  } satisfies IAIMallBackendBehaviorTracking.ICreate;
  const event =
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.create(
      connection,
      {
        customerId: customer.id,
        body: eventInput,
      },
    );
  typia.assert(event);

  // 3. Retrieve the behavior tracking event by its id
  const output =
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.at(
      connection,
      {
        customerId: customer.id,
        behaviorTrackingId: event.id,
      },
    );
  typia.assert(output);

  // 4. Assert all fields match what was submitted
  TestValidator.equals("customer_id matches")(output.customer_id)(customer.id);
  TestValidator.equals("event_type matches")(output.event_type)(
    eventInput.event_type,
  );
  TestValidator.equals("event_data matches")(output.event_data)(
    eventInput.event_data,
  );
  TestValidator.equals("occurred_at matches")(output.occurred_at)(
    eventInput.occurred_at,
  );
}
