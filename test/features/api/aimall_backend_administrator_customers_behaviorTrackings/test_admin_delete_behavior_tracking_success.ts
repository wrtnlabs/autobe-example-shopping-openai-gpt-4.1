import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";

/**
 * Test successful deletion of a customer's behavioral tracking record by an
 * administrator.
 *
 * This test covers the full workflow necessary for exercising and validating
 * the DELETE endpoint for behavior tracking events. The test consists of the
 * following steps:
 *
 * 1. Register a new customer using backend API (/aimall-backend/customers),
 *    collecting the assigned customerId.
 * 2. As admin, create a behavior tracking record for this customer via POST
 *    /aimall-backend/administrator/customers/{customerId}/behaviorTrackings.
 * 3. Perform DELETE on
 *    /aimall-backend/administrator/customers/{customerId}/behaviorTrackings/{id}
 *    using both IDs.
 * 4. (Negative check) Optionally, attempt a secondary deletion for the same event
 *    and confirm it fails (event is already deleted).
 * 5. Assert that audit logging (if retrievable via the system) records this
 *    administrative action for compliance (note: if not directly retrievable,
 *    this step may be documented but not implemented).
 *
 * Validation:
 *
 * - The behavior tracking record is permanently deleted (cannot be deleted twice,
 *   cannot be fetched again if such API exists).
 * - The DELETE endpoint responds as expected (no body, success/failure status
 *   code).
 *
 * Assumptions:
 *
 * - No dedicated GET endpoint for behaviorTrackings exists for direct fetch
 *   validation, so only error-on-second-delete is checked.
 * - Audit logging is not directly tested unless an API is available for checking
 *   logs, per current available endpoints.
 */
export async function test_api_aimall_backend_administrator_customers_behaviorTrackings_test_admin_delete_behavior_tracking_success(
  connection: api.IConnection,
) {
  // 1. Register customer
  const customerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    password_hash: typia.random<string>(),
    status: "active",
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerInput },
  );
  typia.assert(customer);

  // 2. As admin, create a behavior tracking record for the customer
  const eventInput: IAIMallBackendBehaviorTracking.ICreate = {
    event_type: "login",
    event_data: "{}",
    occurred_at: new Date().toISOString() as string & tags.Format<"date-time">,
  };
  const behavior =
    await api.functional.aimall_backend.administrator.customers.behaviorTrackings.create(
      connection,
      {
        customerId: customer.id,
        body: eventInput,
      },
    );
  typia.assert(behavior);

  // 3. Delete the behavior tracking record as admin
  await api.functional.aimall_backend.administrator.customers.behaviorTrackings.erase(
    connection,
    {
      customerId: customer.id,
      behaviorTrackingId: behavior.id,
    },
  );

  // 4. (Negative check) Attempt to delete again, expecting an error
  await TestValidator.error("Should fail to delete an already-deleted record")(
    async () => {
      await api.functional.aimall_backend.administrator.customers.behaviorTrackings.erase(
        connection,
        {
          customerId: customer.id,
          behaviorTrackingId: behavior.id,
        },
      );
    },
  );
}
