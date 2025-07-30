import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";

/**
 * Validate unique email constraint enforcement during customer profile update.
 *
 * This test verifies that attempting to change a customer's email to an email
 * already used by another customer is properly rejected by the system. It
 * ensures the API maintains email uniqueness among all customer accounts, even
 * when updated via the privileged administrator endpoint.
 *
 * Scenario workflow:
 *
 * 1. Register the first customer with a random unique email ("emailA").
 * 2. Register a second customer with a different email ("emailB").
 * 3. Attempt to update the second customer to use "emailA" (already assigned to
 *    the first customer), expecting a uniqueness violation error.
 * 4. Confirm the API enforces uniqueness and does not allow the update.
 */
export async function test_api_aimall_backend_administrator_customers_test_update_customer_with_duplicate_email(
  connection: api.IConnection,
) {
  // 1. Register the first customer (with emailA)
  const emailA = typia.random<string & tags.Format<"email">>();
  const customerA = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: emailA,
        phone: typia.random<string>(),
        password_hash: "hashA",
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customerA);

  // 2. Register second customer (with emailB)
  const emailB = typia.random<string & tags.Format<"email">>();
  const customerB = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: emailB,
        phone: typia.random<string>(),
        password_hash: "hashB",
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customerB);

  // 3. Attempt to update customerB using duplicate emailA
  await TestValidator.error("Should not allow duplicate email on update")(
    async () => {
      await api.functional.aimall_backend.administrator.customers.update(
        connection,
        {
          customerId: customerB.id,
          body: {
            email: emailA,
          } satisfies IAimallBackendCustomer.IUpdate,
        },
      );
    },
  );
}
