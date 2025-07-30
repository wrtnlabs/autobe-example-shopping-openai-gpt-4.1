import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";
import type { IPageIAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAddress";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test advanced search for customer addresses with out-of-bounds pagination.
 *
 * This test ensures the system returns an empty results array and accurate
 * pagination metadata when a customer's address search specifies a page/limit
 * combination that exceeds existing data.
 *
 * Business context:
 *
 * - Customers can have multiple addresses, but searching with an out-of-bounds
 *   page should return no results and proper pagination info.
 *
 * Test Workflow:
 *
 * 1. Register a new customer account.
 * 2. Add an address to this customer.
 * 3. Search addresses with page=2, limit=5 (guaranteed beyond available data).
 * 4. Check that no addresses are returned and pagination is correct.
 */
export async function test_api_aimall_backend_customer_customers_addresses_test_search_customer_addresses_with_out_of_bounds_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Add a single address for this customer
  const address =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Home",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          address_line1: RandomGenerator.paragraph()(),
          city: "Seoul",
          postal_code: "12345",
          country: "South Korea",
          is_default: true,
        } satisfies IAimallBackendAddress.ICreate,
      },
    );
  typia.assert(address);

  // 3. Search with pagination parameters that are out of range
  const page = 2;
  const limit = 5;
  const searchResult =
    await api.functional.aimall_backend.customer.customers.addresses.search(
      connection,
      {
        customerId: customer.id,
        body: {
          page,
          limit,
        } satisfies IAimallBackendAddress.IRequest,
      },
    );
  typia.assert(searchResult);

  // 4. Assert that no addresses are found and pagination reflects this
  TestValidator.equals("no addresses on out-of-bounds page")(searchResult.data)(
    [],
  );
  TestValidator.equals("correct pagination page number")(
    searchResult.pagination.current,
  )(page);
  TestValidator.equals("pagination limit")(searchResult.pagination.limit)(
    limit,
  );
  TestValidator.equals("total record count matches one address")(
    searchResult.pagination.records,
  )(1);
  TestValidator.predicate("pagination pages is at least 1")(
    searchResult.pagination.pages >= 1,
  );
}
