import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";

/**
 * Validate that retrieving the customer account summary as an administrator
 * returns the newly created customer and that all summary fields match. This
 * test ensures that a just-created customer account will be surfaced correctly
 * via the admin customer summary endpoint, with only summary fields present (no
 * password_hash or internal fields).
 *
 * Steps:
 *
 * 1. Create a new customer.
 * 2. Fetch the administrator customer summary (should correspond to the new
 *    customer).
 * 3. Check that the returned summary object's id matches the newly created
 *    customer's id, and all summary fields (email, phone, status, created_at,
 *    updated_at) align exactly.
 */
export async function test_api_aimall_backend_administrator_customers_index(
  connection: api.IConnection,
) {
  // 1. Create a new customer
  const createdCustomer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        status: "active",
        password_hash: null,
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(createdCustomer);

  // 2. Fetch admin customer summary (returns a single summary, not an array)
  const summary: IAimallBackendCustomer.ISummary =
    await api.functional.aimall_backend.administrator.customers.index(
      connection,
    );
  typia.assert(summary);

  // 3. Validate that the summary matches the created customer's summary fields
  TestValidator.equals("id")(summary.id)(createdCustomer.id);
  TestValidator.equals("email")(summary.email)(createdCustomer.email);
  TestValidator.equals("phone")(summary.phone)(createdCustomer.phone);
  TestValidator.equals("status")(summary.status)(createdCustomer.status);
  TestValidator.equals("created_at")(summary.created_at)(
    createdCustomer.created_at,
  );
  TestValidator.equals("updated_at")(summary.updated_at)(
    createdCustomer.updated_at,
  );
}
