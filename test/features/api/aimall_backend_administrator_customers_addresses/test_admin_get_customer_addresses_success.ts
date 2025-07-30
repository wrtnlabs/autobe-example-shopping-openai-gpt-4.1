import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IPageIAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAddress";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";

/**
 * E2E test to verify administrator's ability to retrieve all delivery addresses
 * for a given customer.
 *
 * Scenario:
 *
 * 1. An admin registers a new customer account via the backend customer creation
 *    API.
 * 2. The admin then creates multiple addresses for this customer using the
 *    administrator addresses creation API.
 * 3. The admin calls the administrator address index API to fetch all customer
 *    addresses.
 * 4. The test verifies that the returned data array contains all the addresses
 *    previously registered (by id and content).
 * 5. The test also verifies that pagination metadata is correct according to the
 *    number of addresses.
 *
 * Business rule: Only administrators can call this endpoint for arbitrary
 * customerIds (cross-account access).
 *
 * Edges: Use at least two addresses with different values, one set as default
 * and one not, include/omit optional address_line2 in at least one case.
 */
export async function test_api_aimall_backend_administrator_customers_addresses_index(
  connection: api.IConnection,
) {
  // 1. Register a new customer account
  const customerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
    password_hash: RandomGenerator.alphaNumeric(20),
    status: "active",
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerInput },
  );
  typia.assert(customer);

  // 2. Create two addresses (one default, with/without address_line2)
  const addressInputs: IAimallBackendAddress.ICreate[] = [
    {
      alias: "Home",
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address_line1: "123 Main Street",
      city: "Seoul",
      postal_code: "12345",
      country: "South Korea",
      is_default: true,
    },
    {
      alias: "Office",
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address_line1: "456 Work Ave",
      address_line2: "Suite 200",
      city: "Seoul",
      postal_code: "54321",
      country: "South Korea",
      is_default: false,
    },
  ];
  const createdAddresses: IAimallBackendAddress[] = [];
  for (const addr of addressInputs) {
    const created =
      await api.functional.aimall_backend.administrator.customers.addresses.create(
        connection,
        {
          customerId: customer.id,
          body: addr,
        },
      );
    typia.assert(created);
    createdAddresses.push(created);
  }

  // 3. Fetch address list as admin
  const addressesList =
    await api.functional.aimall_backend.administrator.customers.addresses.index(
      connection,
      {
        customerId: customer.id,
      },
    );
  typia.assert(addressesList);

  // 4. Verify paginated data and presence of all addresses
  TestValidator.equals("number of addresses")(addressesList.data.length)(
    createdAddresses.length,
  );
  const sortedReturned = addressesList.data.sort((a, b) =>
    a.alias.localeCompare(b.alias),
  );
  const sortedCreated = createdAddresses.sort((a, b) =>
    a.alias.localeCompare(b.alias),
  );
  for (let i = 0; i < sortedCreated.length; ++i) {
    TestValidator.equals(`address[${i}] matches`)(sortedReturned[i].alias)(
      sortedCreated[i].alias,
    );
    TestValidator.equals(`address[${i}] recipient_name matches`)(
      sortedReturned[i].recipient_name,
    )(sortedCreated[i].recipient_name);
    TestValidator.equals(`address[${i}] phone matches`)(
      sortedReturned[i].phone,
    )(sortedCreated[i].phone);
    TestValidator.equals(`address[${i}] address_line1 matches`)(
      sortedReturned[i].address_line1,
    )(sortedCreated[i].address_line1);
    TestValidator.equals(`address[${i}] city matches`)(sortedReturned[i].city)(
      sortedCreated[i].city,
    );
    TestValidator.equals(`address[${i}] postal_code matches`)(
      sortedReturned[i].postal_code,
    )(sortedCreated[i].postal_code);
    TestValidator.equals(`address[${i}] country matches`)(
      sortedReturned[i].country,
    )(sortedCreated[i].country);
    TestValidator.equals(`address[${i}] is_default matches`)(
      sortedReturned[i].is_default,
    )(sortedCreated[i].is_default);
    // address_line2 may be optional
    TestValidator.equals(`address[${i}] address_line2 matches`)(
      sortedReturned[i].address_line2 ?? null,
    )(sortedCreated[i].address_line2 ?? null);
  }
  // 5. Optionally, check pagination metadata (basic check)
  TestValidator.predicate("pagination record count")(
    addressesList.pagination.records === createdAddresses.length,
  );
}
