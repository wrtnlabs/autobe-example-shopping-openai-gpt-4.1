import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";

/**
 * Validate update behavior for customer behavior tracking: invalid payload.
 *
 * This test checks that the system properly rejects update attempts with
 * invalid, malformed or missing data. The business logic expects full DTO
 * validation even for partial updates. The process is:
 *
 * 1. Register a customer (via POST /aimall-backend/customers)
 * 2. Log a behavior tracking event for that customer (POST
 *    /aimall-backend/customer/customers/{customerId}/behaviorTrackings)
 * 3. Attempt to update the behavior tracking record with invalid/malformed
 *    payloads (e.g., missing all fields, or wrong data type/format), and
 *    confirm a validation error is thrown (HTTP 400/422).
 *
 * Scenarios to test: a. Completely empty object (no updatable fields provided)
 * b. Wrong data type for event_data (should be string) c. Invalid event_type
 * (e.g., not a string) For each negative case, use TestValidator.error() to
 * validate API throws an error. Do NOT attempt field
 * omission/compilation-failure cases that can't compile in TypeScript.
 */
export async function test_api_aimall_backend_customer_customers_behaviorTrackings_update_invalid_payload(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        status: "active",
        password_hash: null,
      },
    },
  );
  typia.assert(customer);

  // 2. Log a valid event for the customer
  const event =
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.create(
      connection,
      {
        customerId: customer.id,
        body: {
          event_type: "view_product",
          event_data: JSON.stringify({ productId: "1234" }),
          occurred_at: new Date().toISOString() as string &
            tags.Format<"date-time">,
        },
      },
    );
  typia.assert(event);

  // 3a. Attempt update with completely empty object (no updatable fields) - should fail
  await TestValidator.error("empty payload should fail")(async () => {
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.update(
      connection,
      {
        customerId: customer.id,
        behaviorTrackingId: event.id,
        body: {}, // empty object violates validation
      },
    );
  });

  // 3b. Attempt update with wrong data type (event_data as number) - should fail
  await TestValidator.error("event_data as number should fail")(async () => {
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.update(
      connection,
      {
        customerId: customer.id,
        behaviorTrackingId: event.id,
        body: {
          event_data: 1234 as any, // invalid: should be string
        },
      },
    );
  });

  // 3c. Attempt update with invalid event_type (number, not string)
  await TestValidator.error("event_type as number should fail")(async () => {
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.update(
      connection,
      {
        customerId: customer.id,
        behaviorTrackingId: event.id,
        body: {
          event_type: 5678 as any,
        },
      },
    );
  });
}
