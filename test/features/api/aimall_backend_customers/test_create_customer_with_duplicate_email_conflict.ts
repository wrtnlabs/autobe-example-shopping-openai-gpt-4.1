import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";

/**
 * Validate system behavior for duplicate email registration attempts.
 *
 * This test ensures that the business logic correctly enforces the unique email
 * constraint on customer records. The workflow simulates a case where two
 * registration attempts are made using the same email address:
 *
 * 1. Register an initial customer account with a randomly generated but specific
 *    email.
 * 2. Attempt to register a second customer using the exact same email address as
 *    the first.
 * 3. Expect the second registration to fail due to a uniqueness constraint
 *    violation (conflict or validation error).
 *
 * The test passes if the system throws an error for the duplicate email
 * attempt, confirming that no new account is created with a non-unique email.
 * This is essential for maintaining data integrity and preventing account
 * collisions.
 */
export async function test_api_aimall_backend_customers_test_create_customer_with_duplicate_email_conflict(
  connection: api.IConnection,
) {
  // 1. Register the initial customer
  const duplicateEmail = typia.random<string & tags.Format<"email">>();
  const basePayload = {
    email: duplicateEmail,
    phone: typia.random<string>(),
    status: "active",
    password_hash: null,
  } satisfies IAimallBackendCustomer.ICreate;

  const firstCustomer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: basePayload },
  );
  typia.assert(firstCustomer);
  TestValidator.equals("email assigned correctly")(firstCustomer.email)(
    duplicateEmail,
  );

  // 2. Attempt to register a second customer with the same email
  const conflictingPayload = {
    email: duplicateEmail,
    phone: typia.random<string>(),
    status: "active",
    password_hash: null,
  } satisfies IAimallBackendCustomer.ICreate;

  await TestValidator.error("should reject duplicate email registration")(
    async () => {
      await api.functional.aimall_backend.customers.create(connection, {
        body: conflictingPayload,
      });
    },
  );
}
