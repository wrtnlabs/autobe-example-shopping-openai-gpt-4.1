import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";

/**
 * Validate input validation of the customer behavior tracking creation API
 * (POST /aimall-backend/customer/customers/{customerId}/behaviorTrackings) with
 * invalid or incomplete payloads.
 *
 * This test ensures the API correctly rejects requests lacking required fields
 * or including malformed data, and returns clear validation errors without
 * creating a bogus record.
 *
 * Steps:
 *
 * 1. Register a valid customer user to obtain a valid customerId for context.
 * 2. Attempt to create behavior tracking records with invalid payloads,
 *    specifically:
 *
 *    - Missing 'event_type' field.
 *    - Malformed 'occurred_at' (e.g., not an ISO8601 date string).
 *    - Missing all required fields (empty object).
 *    - Extra unexpected fields.
 * 3. Assert that each invalid request results in an error (via
 *    TestValidator.error), and no record is created.
 *
 * Only API-level runtime business validation errors are checked (no
 * TypeScript-level validation errors or compile-time negative tests). No
 * storage checking is performed as the API contract does not expose that
 * capability here.
 */
export async function test_api_aimall_backend_customer_customers_behaviorTrackings_test_customer_create_behavior_tracking_invalid_payload(
  connection: api.IConnection,
) {
  // 1. Register a valid customer user
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2a. Missing 'event_type' field
  await TestValidator.error("missing 'event_type'")(() =>
    api.functional.aimall_backend.customer.customers.behaviorTrackings.create(
      connection,
      {
        customerId: customer.id,
        body: {
          event_data: "{}",
          occurred_at: new Date().toISOString(),
        } as any, // TypeScript will block this at compile time; using as any for runtime path only
      },
    ),
  );

  // 2b. Malformed 'occurred_at'
  await TestValidator.error("malformed 'occurred_at'")(() =>
    api.functional.aimall_backend.customer.customers.behaviorTrackings.create(
      connection,
      {
        customerId: customer.id,
        body: {
          event_type: "login",
          event_data: "{}",
          occurred_at: "not-a-date",
        },
      },
    ),
  );

  // 2c. Empty object (missing all required fields)
  await TestValidator.error("missing all required fields")(() =>
    api.functional.aimall_backend.customer.customers.behaviorTrackings.create(
      connection,
      {
        customerId: customer.id,
        body: {} as any, // Using as any for runtime negative test only
      },
    ),
  );

  // 2d. Extra (unexpected) fields
  await TestValidator.error("extra unexpected fields")(() =>
    api.functional.aimall_backend.customer.customers.behaviorTrackings.create(
      connection,
      {
        customerId: customer.id,
        body: {
          event_type: "login",
          event_data: "{}",
          occurred_at: new Date().toISOString(),
          extra_field: "should_fail",
        } as any, // Using as any for runtime negative test only
      },
    ),
  );
}
