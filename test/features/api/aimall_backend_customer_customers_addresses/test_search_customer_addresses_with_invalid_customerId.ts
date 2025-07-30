import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";
import type { IPageIAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAddress";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test advanced address search error when given non-existent customerId.
 *
 * This test attempts to perform an advanced search on the endpoint
 * /aimall-backend/customer/customers/{customerId}/addresses by specifying a
 * customerId that does not exist in the system. It confirms that an error
 * (e.g., 404 Not Found) is returned, and that the response indicates no
 * results.
 *
 * Steps:
 *
 * 1. Generate a random UUID that deliberately does not match any existing customer
 *    (do not create a customer).
 * 2. Attempt to search for addresses for this nonexistent customer (PATCH
 *    /aimall-backend/customer/customers/{customerId}/addresses).
 * 3. Validate that an error such as 404 Not Found is returned, or that the
 *    response indicates the customer does not exist and no address data is
 *    given.
 * 4. Confirm that the data set is empty if a page structure is still returned.
 */
export async function test_api_aimall_backend_customer_customers_addresses_test_search_customer_addresses_with_invalid_customerId(
  connection: api.IConnection,
) {
  // 1. Generate a UUID that is not associated with any customer (test setup)
  const invalidCustomerId = typia.random<string & tags.Format<"uuid">>();

  // 2. Prepare a generic paging/filter request (all fields undefined)
  const body: IAimallBackendAddress.IRequest = {};

  // 3. Attempt the search and validate error handling
  await TestValidator.error(
    "should throw or return empty for nonexistent customer",
  )(async () => {
    const result =
      await api.functional.aimall_backend.customer.customers.addresses.search(
        connection,
        {
          customerId: invalidCustomerId,
          body,
        },
      );
    // If SDK does not throw, verify no data returned
    typia.assert(result);
    TestValidator.equals("no records for nonexistent customer")(
      result.data.length,
    )(0);
  });
}
