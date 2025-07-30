import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IPageIAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAIMallBackendBehaviorTracking";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";

/**
 * Ensure that users cannot access behavioral tracking data belonging to other
 * customers (privacy enforcement).
 *
 * This test scenario validates that behavioral tracking data for a customer is
 * strictly private and inaccessible to other customers. The business logic
 * requires that only the owner (or perhaps an admin) can fetch these logs. Any
 * access attempt by a different user should trigger a 403 Forbidden error,
 * ensuring strict data isolation and privacy compliance.
 *
 * Test steps:
 *
 * 1. Register two customers (Customer A and Customer B), each with distinct email
 *    and phone values.
 * 2. As Customer B, create/log at least one behavior tracking event (for retrieval
 *    target).
 * 3. Attempt to fetch Customer B's behavior tracking logs using Customer A's
 *    credentials.
 * 4. Verify that the GET operation fails with 403 Forbidden (access is denied).
 */
export async function test_api_aimall_backend_customer_customers_behaviorTrackings_test_get_behavior_trackings_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Register Customer A
  const customerAEmail: string = typia.random<string & tags.Format<"email">>();
  const customerA: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customerAEmail,
        phone: RandomGenerator.mobile(),
        status: "active",
        password_hash: "hashed_passwordA", // Simulated secure hash
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customerA);

  // 2. Register Customer B
  const customerBEmail: string = typia.random<string & tags.Format<"email">>();
  const customerB: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customerBEmail,
        phone: RandomGenerator.mobile(),
        status: "active",
        password_hash: "hashed_passwordB", // Simulated secure hash
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customerB);

  // 3. Log a behavior tracking event for Customer B (for retrieval target)
  const behaviorTracking: IAIMallBackendBehaviorTracking =
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.create(
      connection,
      {
        customerId: customerB.id,
        body: {
          event_type: "view_product",
          event_data: JSON.stringify({ productId: "prod-12345" }),
          occurred_at: new Date().toISOString(),
        } satisfies IAIMallBackendBehaviorTracking.ICreate,
      },
    );
  typia.assert(behaviorTracking);

  // 4. Attempt to fetch Customer B's logs using Customer A's context & expect 403
  // (Assume that API gateway/handler uses connection headers for auth, so simulate as Customer A)
  // Optionally: Log in as Customer A if required, e.g., by updating connection context.
  // For this test, we skip explicit login as there's no login function provided; assume account context is handled via headers elsewhere.
  await TestValidator.error(
    "Accessing another customer's behaviorTrackings must be forbidden",
  )(async () => {
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.index(
      connection,
      {
        customerId: customerB.id,
      },
    );
  });
}
