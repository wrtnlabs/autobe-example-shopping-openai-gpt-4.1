import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";

/**
 * Test the creation of a customer behavior tracking event.
 *
 * This test verifies that after successfully registering a new customer, a
 * behavior tracking event such as "login" or "view_product" can be recorded for
 * that customer. It checks the correct association with the customer and
 * ensures the returned event record accurately reflects the input details.
 *
 * Test steps:
 *
 * 1. Register a new customer using API (dependency setup)
 * 2. Record a behavior tracking event for this customer
 * 3. Validate the returned event data:
 *
 *    - Confirm customer ID matches the registered customer
 *    - All properties (event type, data, and timestamp) persist correctly
 *    - ID and timestamps in output are present and properly formatted
 */
export async function test_api_aimall_backend_customer_customers_behaviorTrackings_test_customer_create_behavior_tracking_success(
  connection: api.IConnection,
) {
  // 1. Register a new customer (dependency)
  const customerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    password_hash: null,
    status: "active",
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerInput },
  );
  typia.assert(customer);

  // 2. Submit a behavior tracking event for this customer
  const now = new Date().toISOString();
  const eventInput: IAIMallBackendBehaviorTracking.ICreate = {
    event_type: "login", // common behavioral event
    event_data: JSON.stringify({ ip: "127.0.0.1", success: true }),
    occurred_at: now,
  };
  const record =
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.create(
      connection,
      {
        customerId: customer.id,
        body: eventInput,
      },
    );
  typia.assert(record);

  // 3. Confirm returned event matches input and relates to customer
  TestValidator.equals("customer id matches")(record.customer_id)(customer.id);
  TestValidator.equals("event type matches")(record.event_type)(
    eventInput.event_type,
  );
  TestValidator.equals("event_data matches")(record.event_data)(
    eventInput.event_data,
  );
  TestValidator.equals("occurred_at matches")(record.occurred_at)(
    eventInput.occurred_at,
  );
  TestValidator.predicate("output has an id")(
    typeof record.id === "string" && record.id.length > 10,
  );
}
