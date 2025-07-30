import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";

/**
 * Validate backend input rejection for invalid customer email format.
 *
 * This test ensures that the customer creation endpoint enforces input
 * validation rules by rejecting an invalid email address (not conforming to
 * standard email format). It asserts that the backend layer will not create a
 * customer with malformed input, even if the frontend is bypassed or fails
 * validation.
 *
 * Steps:
 *
 * 1. Prepare a customer registration input with an invalid email string (e.g.,
 *    'not-an-email'), and valid values for all other required properties.
 * 2. Attempt to create the customer using the API.
 * 3. Verify that the API responds with a validation error and no customer is
 *    created.
 */
export async function test_api_aimall_backend_customers_test_create_customer_with_invalid_email_format(
  connection: api.IConnection,
) {
  // Step 1: Prepare an input object with an invalid email address
  const invalidEmail = "not-an-email"; // Intentionally NOT a valid email format
  const input = {
    email: invalidEmail,
    phone: typia.random<string>(), // Any plausible phone number string
    password_hash: typia.random<string>(), // Any plausible string for hash
    status: "active", // Typical initial status
  } satisfies IAimallBackendCustomer.ICreate;

  // Step 2: Attempt customer creation and expect a validation error
  await TestValidator.error("should reject invalid email format")(async () => {
    await api.functional.aimall_backend.customers.create(connection, {
      body: input,
    });
  });
}
