import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IPageIAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAddress";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";

/**
 * Validate that an admin requesting the address list for a customer who has no
 * delivery addresses receives an empty result without error.
 *
 * Business context: Admin users need to be able to view all customer address
 * records, even if none exist, so that frontends and flows can display empty
 * states cleanly. This tests the empty addressbook scenario, which should not
 * throw errors and must return a correct, empty paginated result.
 *
 * Steps:
 *
 * 1. Create a customer account (no addresses registered).
 * 2. As admin, request the complete address list for that customer via the
 *    administrator endpoint.
 * 3. Validate the returned address list is empty (data: []), no errors are thrown,
 *    and pagination metadata (records/pages) is correct (zero).
 */
export async function test_api_aimall_backend_administrator_customers_addresses_test_admin_get_addresses_no_addresses(
  connection: api.IConnection,
) {
  // 1. Create a customer account (with no addresses)
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: uniqueEmail,
        phone: RandomGenerator.mobile(),
        status: "active",
        password_hash: null,
      },
    },
  );
  typia.assert(customer);

  // 2. Admin requests this customer's address list
  const output =
    await api.functional.aimall_backend.administrator.customers.addresses.index(
      connection,
      {
        customerId: customer.id,
      },
    );
  typia.assert(output);

  // 3. Validate address list is empty and pagination shows zero records/pages
  TestValidator.equals("address list is empty")(output.data)([]);
  TestValidator.equals("pagination: records count is zero")(
    output.pagination.records,
  )(0);
  TestValidator.equals("pagination: pages count is zero")(
    output.pagination.pages,
  )(0);
}
