import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";

/**
 * Validate the system enforces required tracking consent for behavioral event
 * logging.
 *
 * This test ensures a customer who has NOT provided explicit behavioral
 * tracking consent cannot log behavioral events. It simulates a real user
 * flow:
 *
 * 1. Register a new customer account, ensuring no behavioral tracking consent is
 *    given (since the DTO and API do not expose consent fields, this assumes
 *    platform logic blocks by default for new customers without upstream opt-in
 *    mechanism).
 * 2. Attempt to submit a behavioral tracking event (such as 'login',
 *    'view_product', etc.) for this customer.
 * 3. Confirm the API rejects the operation, signaling permission or validation
 *    error (HTTP 403, 422, etc.).
 *
 * NOTE: Behavior will depend on how consent logic is enforced in the API. Since
 * no DTO exposes explicit consent, only default consentless registration can be
 * simulated.
 */
export async function test_api_aimall_backend_customer_customers_behaviorTrackings_test_customer_create_behavior_tracking_without_consent_fails(
  connection: api.IConnection,
) {
  // 1. Register a customer without any consent field.
  const customerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    status: "active",
    password_hash: null,
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerInput },
  );
  typia.assert(customer);

  // 2. Attempt to submit a behavioral tracking event for the new customer.
  const trackingInput: IAIMallBackendBehaviorTracking.ICreate = {
    event_type: "login",
    event_data: JSON.stringify({ device: "test-device" }),
    occurred_at: new Date().toISOString(),
  };

  await TestValidator.error("Should fail due to missing consent")(() =>
    api.functional.aimall_backend.customer.customers.behaviorTrackings.create(
      connection,
      {
        customerId: customer.id,
        body: trackingInput,
      },
    ),
  );
}
