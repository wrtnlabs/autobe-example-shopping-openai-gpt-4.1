import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";

/**
 * Test permanent deletion of a customer behavior tracking event by its owner.
 *
 * Verifies that a customer account can hard-delete a personal behavior tracking
 * record, as required for privacy (right-to-be-forgotten). This test simulates
 * a customer registration, event creation, and then record deletion, checking
 * that the operation completes and returns no body. If resource lookup were
 * possible, post-delete retrieval would be expected to fail.
 *
 * Steps:
 *
 * 1. Register a new customer (unique email/phone, status active)
 * 2. Create a behavior tracking event for that customer (e.g., "login")
 * 3. Hard-delete the just-created event as the customer (irreversible)
 * 4. (Optional, not implemented): Attempt to get the event after deletion—expected
 *    not found. This is skipped as no GET endpoint is provided.
 */
export async function test_api_aimall_backend_customer_customers_behaviorTrackings_test_delete_behavior_tracking_event_owner_success(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    password_hash: null,
    status: "active",
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: customerInput,
    },
  );
  typia.assert(customer);

  // 2. Create a behavior tracking event for this customer
  const trackingInput: IAIMallBackendBehaviorTracking.ICreate = {
    event_type: "login",
    event_data: '{"ip":"127.0.0.1"}',
    occurred_at: new Date().toISOString(),
  };
  const tracking =
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.create(
      connection,
      {
        customerId: customer.id,
        body: trackingInput,
      },
    );
  typia.assert(tracking);

  // 3. Delete the event as owner (hard delete)
  await api.functional.aimall_backend.customer.customers.behaviorTrackings.erase(
    connection,
    {
      customerId: customer.id,
      behaviorTrackingId: tracking.id,
    },
  );

  // 4. (Not implemented) If there were a GET endpoint, would attempt retrieval here and assert not found.
}
