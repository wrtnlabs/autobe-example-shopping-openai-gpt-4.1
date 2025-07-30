import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";

/**
 * Validates that customers cannot access behavioral tracking events of other
 * customers.
 *
 * This test ensures strict isolation of behavioral event viewing rights between
 * customer accounts. The workflow simulates two different users, A and B. User
 * A creates a behavior tracking record, and User B attempts to access it by ID,
 * confirming that only the owner (User A) may retrieve this tracking record.
 * Any access attempt by User B must fail, returning a permission error (either
 * not found or forbidden, both acceptable per privacy rules).
 *
 * Test Steps:
 *
 * 1. Register Customer A (unique email/phone)
 * 2. Register Customer B (unique email/phone)
 * 3. As Customer A, create a behavior tracking event
 * 4. As Customer B, attempt to GET the tracking event using Customer B id and the
 *    event's ID; must fail (forbidden/not found)
 *
 * Validation: Step 4 request must throw an error (TestValidator.error). No
 * record details should be disclosed to Customer B. Error can be forbidden/not
 * found (acceptable as both preserve privacy).
 */
export async function test_api_aimall_backend_customer_customers_behaviorTrackings_test_get_behavior_tracking_details_permission_denied_for_other_customer(
  connection: api.IConnection,
) {
  // 1. Register Customer A
  const customerA = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      },
    },
  );
  typia.assert(customerA);

  // 2. Register Customer B
  const customerB = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      },
    },
  );
  typia.assert(customerB);

  // 3. As Customer A, create a behavior tracking event
  const behaviorTracking =
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.create(
      connection,
      {
        customerId: customerA.id,
        body: {
          event_type: "view_product",
          event_data: JSON.stringify({ productId: "example_product_id" }),
          occurred_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(behaviorTracking);

  // 4. As Customer B, attempt to fetch Customer A's event; must throw permission error (forbidden/not found)
  await TestValidator.error(
    "Should not allow one customer to view another's behavior tracking event",
  )(async () => {
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.at(
      connection,
      {
        customerId: customerB.id,
        behaviorTrackingId: behaviorTracking.id,
      },
    );
  });
}
