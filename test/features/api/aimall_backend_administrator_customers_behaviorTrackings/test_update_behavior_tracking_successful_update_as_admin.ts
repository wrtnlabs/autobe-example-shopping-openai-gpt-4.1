import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";

/**
 * Verify successful behavioral tracking event update as admin.
 *
 * This test ensures that an administrator can perform the following series of
 * actions:
 *
 * 1. Create a new customer in the system (as required for behavior tracking
 *    association).
 * 2. Create a behavioral tracking record for the customer via the appropriate
 *    admin endpoint.
 * 3. Update the existing behavioral tracking record using the admin PUT endpoint,
 *    modifying both event_type and event_data fields.
 * 4. Validate that the response from the API reflects the changes that were
 *    submitted (both fields updated as expected) and the returned record still
 *    associates with the correct customer and record ID.
 *
 * This test covers data auditability, admin permission, and mutations of
 * behavioral event fields, following the scenario requirements.
 */
export async function test_api_aimall_backend_administrator_customers_behaviorTrackings_test_update_behavior_tracking_successful_update_as_admin(
  connection: api.IConnection,
) {
  // 1. Create a new customer for association
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: typia.random<string>(),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a behavioral tracking record for that customer
  const tracking =
    await api.functional.aimall_backend.administrator.customers.behaviorTrackings.create(
      connection,
      {
        customerId: customer.id,
        body: {
          event_type: "login",
          event_data: JSON.stringify({
            ip: "127.0.0.1",
            device: "chrome_test",
          }),
          occurred_at: new Date().toISOString(),
        } satisfies IAIMallBackendBehaviorTracking.ICreate,
      },
    );
  typia.assert(tracking);

  // 3. Update the record: change event_type and event_data
  const updatedType = "add_cart";
  const updatedPayload = {
    ip: "127.0.0.1",
    device: "firefox_test",
    item: "product-1234",
  };
  const updated =
    await api.functional.aimall_backend.administrator.customers.behaviorTrackings.update(
      connection,
      {
        customerId: customer.id,
        behaviorTrackingId: tracking.id,
        body: {
          event_type: updatedType,
          event_data: JSON.stringify(updatedPayload),
        } satisfies IAIMallBackendBehaviorTracking.IUpdate,
      },
    );
  typia.assert(updated);

  // 4. Validate updates and primary associations
  TestValidator.equals("updated event type")(updated.event_type)(updatedType);
  TestValidator.equals("updated event data")(updated.event_data)(
    JSON.stringify(updatedPayload),
  );
  TestValidator.equals("same customer")(updated.customer_id)(customer.id);
  TestValidator.equals("same id")(updated.id)(tracking.id);
}
