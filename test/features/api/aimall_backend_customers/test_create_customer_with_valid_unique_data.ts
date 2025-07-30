import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";

/**
 * Validate the successful registration of a new customer using unique, valid
 * data.
 *
 * This test ensures that the backend properly creates a customer when receiving
 * a full IAimallBackendCustomer.ICreate payload with unique values. The backend
 * must echo required fields (email, phone, status), assign a new UUID id, set
 * audit timestamps (created_at, updated_at), and handle sensitive fields like
 * password_hash as defined for admin/internal endpoints. This is vital for the
 * security and integrity of the customer onboarding process as it validates
 * both the business logic and data correctness.
 *
 * Steps:
 *
 * 1. Generate unique and valid data for all IAimallBackendCustomer.ICreate fields.
 *
 *    - Use strong random formats for email and phone.
 *    - Assign status to 'active'.
 *    - Use a mock password_hash value as a bcrypt hash.
 * 2. Call the create API and receive the full customer record in response.
 * 3. Assert that the output is valid IAimallBackendCustomer and all echo fields
 *    match inputs.
 * 4. Confirm audit fields (id, created_at, updated_at) are correctly assigned and
 *    well-formatted.
 * 5. Confirm that password_hash is present as this is an admin-backend operation.
 */
export async function test_api_aimall_backend_customers_test_create_customer_with_valid_unique_data(
  connection: api.IConnection,
) {
  // 1. Generate unique input data for customer registration
  const email = typia.random<string & tags.Format<"email">>();
  const phone = "010" + typia.random<string & tags.Pattern<"[0-9]{8}">>();
  const status = "active";
  const password_hash = "$2b$10$saltandpepper1234567890abcdefghijklm"; // plausible bcrypt hash for test

  const input: IAimallBackendCustomer.ICreate = {
    email,
    phone,
    status,
    password_hash,
  };

  // 2. Invoke customer create API
  const output = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: input,
    },
  );

  // 3. Validate output type and echo fields
  typia.assert(output);
  TestValidator.equals("email echo")(output.email)(email);
  TestValidator.equals("phone echo")(output.phone)(phone);
  TestValidator.equals("status echo")(output.status)(status);
  TestValidator.equals("password_hash echo")(output.password_hash)(
    password_hash,
  );

  // 4. Check assigned id is a valid UUID (RFC4122 basic regex)
  TestValidator.predicate("id is UUID")(
    typeof output.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        output.id,
      ),
  );

  // 5. Validate created_at and updated_at are valid ISO date-times
  TestValidator.predicate("created_at is ISO date-time")(
    !isNaN(Date.parse(output.created_at)),
  );
  TestValidator.predicate("updated_at is ISO date-time")(
    !isNaN(Date.parse(output.updated_at)),
  );

  // 6. (Optional) Confirm no extra fields present beyond defined IAimallBackendCustomer properties
  const allowedKeys = [
    "id",
    "email",
    "phone",
    "password_hash",
    "status",
    "created_at",
    "updated_at",
  ];
  TestValidator.equals("no extra fields")(Object.keys(output).sort())(
    allowedKeys.sort(),
  );
}
