import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";
import type { IPageIAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAddress";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates admin ability to filter customer addresses by `is_default` flag
 * (only default address should be returned).
 *
 * This test ensures that advanced address search for a given customer using the
 * `is_default` filter returns only addresses explicitly marked as default.
 *
 * 1. Register a customer and get the resulting UUID
 * 2. Add multiple addresses for this customer using the admin endpoint, with at
 *    least one address flagged as is_default=true and others as false
 * 3. As administrator, perform PATCH search for addresses with `is_default` only
 * 4. Verify that result contains only the address where is_default=true and no
 *    others
 */
export async function test_api_aimall_backend_administrator_customers_addresses_test_admin_search_addresses_by_default_flag(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: RandomGenerator.alphabets(8) + "@test.com",
        phone: RandomGenerator.mobile(),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Add multiple addresses (at least one with is_default=true)
  const defaultAddress =
    await api.functional.aimall_backend.administrator.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Home",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          address_line1: RandomGenerator.paragraph()(5),
          city: "Seoul",
          postal_code: "04524",
          country: "Korea",
          is_default: true,
        },
      },
    );
  typia.assert(defaultAddress);
  const otherAddress =
    await api.functional.aimall_backend.administrator.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Office",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          address_line1: RandomGenerator.paragraph()(6),
          city: "Seoul",
          postal_code: "05555",
          country: "Korea",
          is_default: false,
        },
      },
    );
  typia.assert(otherAddress);

  // 3. Admin PATCH search filtering is_default=true
  const searchResult =
    await api.functional.aimall_backend.administrator.customers.addresses.search(
      connection,
      {
        customerId: customer.id,
        body: { is_default: true },
      },
    );
  typia.assert(searchResult);

  // 4. Assert only the default address is returned
  TestValidator.equals("returned only default address")(
    searchResult.data.length,
  )(1);
  TestValidator.equals("returned address is the default")(
    searchResult.data[0].id,
  )(defaultAddress.id);
  TestValidator.equals("returned address is_default is true")(
    searchResult.data[0].is_default,
  )(true);
}
