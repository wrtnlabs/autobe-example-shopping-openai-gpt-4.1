import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";

/**
 * Test fetching a behavior tracking record for a customer with an invalid event
 * ID.
 *
 * This test verifies the error handling logic when a client attempts to fetch a
 * specific behavioral tracking event for a customer using a non-existent or
 * invalid behaviorTrackingId. The response should be a not found or relevant
 * error, with no information leakage about internal records.
 *
 * Steps:
 *
 * 1. Register a new customer account (using /aimall-backend/customers POST
 *    endpoint).
 * 2. Attempt to retrieve a behavior tracking record for that customer using a
 *    random (invalid) UUID for the behaviorTrackingId field.
 * 3. Validate that the system throws an error (e.g. not found), and does not leak
 *    any sensitive/internal data in the response.
 */
export async function test_api_aimall_backend_customer_customers_behaviorTrackings_test_get_behavior_tracking_details_failure_invalid_event_id(
  connection: api.IConnection,
) {
  // 1. Register a new customer account
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Generate a random (non-existent) event UUID
  const invalidTrackingId = typia.random<string & tags.Format<"uuid">>();

  // 3. Try to access the behavior tracking resource (should error)
  await TestValidator.error("non-existent behaviorTrackingId yields not found")(
    () =>
      api.functional.aimall_backend.customer.customers.behaviorTrackings.at(
        connection,
        {
          customerId: customer.id,
          behaviorTrackingId: invalidTrackingId,
        },
      ),
  );
}
