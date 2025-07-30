import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";

/**
 * Validate that an administrator can retrieve a specific behavior tracking
 * record for a customer.
 *
 * This test verifies that after registering a customer and logging a behavioral
 * event for them, an administrator account can access the tracking details via
 * the admin API, confirming record ownership and event accuracy.
 *
 * Business flow:
 *
 * 1. Register a new customer with required fields.
 * 2. Log a behavioral tracking event for that customer.
 * 3. Register an administrator (simulate privileged access; assume registration is
 *    sufficient, as explicit admin authentication is not available).
 * 4. Use the administrator API to fetch the event for the customer by id.
 * 5. Assert returned tracking record matches event details logged previously.
 */
export async function test_api_aimall_backend_administrator_customers_behaviorTrackings_at_success(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const customerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    status: "active",
    // password_hash is optional/nullable; SEC: do not provide for customer
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: customerInput,
    },
  );
  typia.assert(customer);

  // 2. Log behavior tracking event for the customer
  const behaviorInput: IAIMallBackendBehaviorTracking.ICreate = {
    event_type: "login",
    event_data: JSON.stringify({ ip: "127.0.0.1", method: "web" }),
    occurred_at: new Date().toISOString(),
  };
  const behavior =
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.create(
      connection,
      {
        customerId: customer.id,
        body: behaviorInput,
      },
    );
  typia.assert(behavior);

  // 3. Register an administrator (simulate privileged access)
  const adminInput: IAimallBackendAdministrator.ICreate = {
    permission_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string>(),
    name: "Test Admin",
    status: "active",
  };
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: adminInput,
      },
    );
  typia.assert(admin);

  // 4. As administrator, fetch the behavioral tracking event
  const tracking =
    await api.functional.aimall_backend.administrator.customers.behaviorTrackings.at(
      connection,
      {
        customerId: customer.id,
        behaviorTrackingId: behavior.id,
      },
    );
  typia.assert(tracking);

  // 5. Assert the returned data matches the event
  TestValidator.equals("customerId should match")(tracking.customer_id)(
    customer.id,
  );
  TestValidator.equals("event_type should match")(tracking.event_type)(
    behaviorInput.event_type,
  );
  TestValidator.equals("event_data should match")(tracking.event_data)(
    behaviorInput.event_data,
  );
  TestValidator.equals("occurred_at should match")(tracking.occurred_at)(
    behaviorInput.occurred_at,
  );
}
