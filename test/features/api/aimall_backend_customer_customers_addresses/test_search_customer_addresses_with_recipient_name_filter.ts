import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";
import type { IPageIAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAddress";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test advanced search/filter for a customer's addresses using recipient_name
 * substring match.
 *
 * Validates:
 *
 * 1. Customer registration and creation of multiple addresses with varied
 *    recipient_name values.
 * 2. Filtering addresses by recipient_name substring, confirming only matching
 *    results are returned.
 * 3. Pagination correctness when multiple results exist (separate results for each
 *    page).
 *
 * Steps:
 *
 * 1. Register a new customer.
 * 2. Add multiple addresses for the customer with different recipient_name/city.
 * 3. Pick a substring that matches multiple recipient_name fields.
 * 4. Search for addresses by that substring (PATCH
 *    /aimall-backend/customer/customers/{customerId}/addresses).
 * 5. Validate results only include correct matches and match input data.
 * 6. If multiple matches, verify pagination returns separate correct results.
 */
export async function test_api_aimall_backend_customer_customers_addresses_test_search_customer_addresses_with_recipient_name_filter(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPhone = RandomGenerator.mobile();
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customerEmail,
        phone: customerPhone,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Add multiple addresses with varied recipient_name/city values
  const addressesInput = [
    {
      alias: "Home",
      recipient_name: "Jane Kim",
      phone: RandomGenerator.mobile(),
      address_line1: RandomGenerator.paragraph()(),
      city: "Seoul",
      postal_code: "06236",
      country: "South Korea",
      is_default: true,
    },
    {
      alias: "Work",
      recipient_name: "Janet Lee",
      phone: RandomGenerator.mobile(),
      address_line1: RandomGenerator.paragraph()(),
      city: "Busan",
      postal_code: "48822",
      country: "South Korea",
      is_default: false,
    },
    {
      alias: "Family",
      recipient_name: "Kim Jangho",
      phone: RandomGenerator.mobile(),
      address_line1: RandomGenerator.paragraph()(),
      city: "Incheon",
      postal_code: "21554",
      country: "South Korea",
      is_default: false,
    },
  ];

  const createdAddresses = [];
  for (const body of addressesInput) {
    const address =
      await api.functional.aimall_backend.customer.customers.addresses.create(
        connection,
        {
          customerId: customer.id,
          body,
        },
      );
    typia.assert(address);
    createdAddresses.push(address);
  }

  // 3. Pick substring for recipient_name that matches multiple: "Jane"
  const recipientFilter = "Jane";
  const expectedMatches = createdAddresses.filter((a) =>
    a.recipient_name.includes(recipientFilter),
  );

  // 4. Search addresses by recipient_name substring
  const result =
    await api.functional.aimall_backend.customer.customers.addresses.search(
      connection,
      {
        customerId: customer.id,
        body: {
          recipient_name: recipientFilter,
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(result);

  // 5. Validate all results actually contain "Jane" in recipient_name
  TestValidator.predicate("all addresses match recipient_name substring")(
    result.data.every((a) => a.recipient_name.includes(recipientFilter)),
  );
  TestValidator.equals("result count matches inputs")(result.data.length)(
    expectedMatches.length,
  );

  // 6. Pagination: if multiple matches, verify they appear on different pages
  if (expectedMatches.length > 1) {
    const firstPage =
      await api.functional.aimall_backend.customer.customers.addresses.search(
        connection,
        {
          customerId: customer.id,
          body: {
            recipient_name: recipientFilter,
            limit: 1,
            page: 1,
          },
        },
      );
    typia.assert(firstPage);
    TestValidator.equals("page 1 size = 1")(firstPage.data.length)(1);

    const secondPage =
      await api.functional.aimall_backend.customer.customers.addresses.search(
        connection,
        {
          customerId: customer.id,
          body: {
            recipient_name: recipientFilter,
            limit: 1,
            page: 2,
          },
        },
      );
    typia.assert(secondPage);
    TestValidator.equals("page 2 size = 1")(secondPage.data.length)(1);
    TestValidator.notEquals("page 1 and 2 have different address ids")(
      firstPage.data[0].id,
    )(secondPage.data[0].id);
  }
}
