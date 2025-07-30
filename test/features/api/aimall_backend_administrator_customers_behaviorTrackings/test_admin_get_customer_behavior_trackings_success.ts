import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IPageIAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAIMallBackendBehaviorTracking";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";

/**
 * Validates that an administrator can retrieve all behavior tracking events for
 * a specific customer and that the records match those that were logged.
 *
 * Business Context:
 *
 * - Ensures admin-level visibility and auditability of all customer-related
 *   behavioral events (analytics, troubleshooting, policy compliance, etc).
 * - Confirms the system keeps a reliable event log for each customer and grants
 *   admin access for monitoring.
 *
 * Step-by-step process:
 *
 * 1. Register a new customer via POST /aimall-backend/customers
 * 2. Log multiple behavioral events for that customer using POST
 *    /aimall-backend/administrator/customers/{customerId}/behaviorTrackings
 * 3. As administrator, fetch the customer’s behavior tracking history using GET
 *    /aimall-backend/administrator/customers/{customerId}/behaviorTrackings
 * 4. Assert that the returned events match those that were logged (ordered as
 *    appropriate)
 * 5. Optionally, check audit log compliance (if available in API contract)
 */
export async function test_api_aimall_backend_administrator_customers_behaviorTrackings_test_admin_get_customer_behavior_trackings_success(
  connection: api.IConnection,
) {
  // 1. Register a new test customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: RandomGenerator.alphabets(8) + "@mail.com",
        phone: "010" + typia.random<string>().padStart(8, "5"),
        password_hash: RandomGenerator.alphabets(20),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Log multiple behavior tracking events for the customer
  const events = await ArrayUtil.asyncRepeat(3)(async (i) => {
    const event: IAIMallBackendBehaviorTracking =
      await api.functional.aimall_backend.administrator.customers.behaviorTrackings.create(
        connection,
        {
          customerId: customer.id,
          body: {
            event_type: RandomGenerator.pick([
              "login",
              "add_cart",
              "view_product",
            ]),
            event_data: JSON.stringify({
              product: RandomGenerator.alphabets(5),
              count: i + 1,
            }),
            occurred_at: new Date(
              Date.now() - i * 1000 * 60 * 10,
            ).toISOString(),
          } satisfies IAIMallBackendBehaviorTracking.ICreate,
        },
      );
    typia.assert(event);
    return event;
  });

  // 3. Administrator fetches the customer's behavior tracking history
  const result =
    await api.functional.aimall_backend.administrator.customers.behaviorTrackings.index(
      connection,
      {
        customerId: customer.id,
      },
    );
  typia.assert(result);

  TestValidator.equals("behavior tracking count")(result.data.length)(
    events.length,
  );

  // 4. Assert that retrieved records match those logged (by id and type)
  const expectedIds = new Set(events.map((e) => e.id));
  const returnedIds = new Set(result.data.map((e) => e.id));
  TestValidator.equals("all created event ids present")(returnedIds)(
    expectedIds,
  );
  // 5. (Optional) Could assert sorting or timestamps match, if required by business contract
}
