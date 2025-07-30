import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IPageIAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAddress";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";

/**
 * Validate that a logged-in customer can retrieve their own list of delivery
 * addresses.
 *
 * This test ensures a customer can register, create multiple delivery
 * addresses, and successfully retrieve those addresses with accurate details.
 * Each property is checked to ensure consistency between creation and
 * retrieval. The test strictly follows only owner access, as cross-customer
 * access is untestable with the given APIs.
 *
 * Steps:
 *
 * 1. Register a new customer (POST /aimall-backend/customers)
 * 2. Add at least two addresses for this customer (POST
 *    /aimall-backend/customer/customers/{customerId}/addresses)
 * 3. Retrieve all addresses for this customer (GET
 *    /aimall-backend/customer/customers/{customerId}/addresses)
 * 4. Validate that the retrieved addresses exactly match the created ones (by id
 *    and all fields)
 */
export async function test_api_aimall_backend_customer_customers_addresses_test_get_customer_addresses_as_owner(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const email = typia.random<string & tags.Format<"email">>();
  const phone = RandomGenerator.mobile();
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email,
        phone,
        status: "active",
        password_hash: RandomGenerator.alphaNumeric(16),
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Add two distinct addresses for the customer
  const addressInputs: IAimallBackendAddress.ICreate[] = [
    {
      alias: "Home",
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address_line1: RandomGenerator.paragraph()(6),
      address_line2: "Apt 101",
      city: "Seoul",
      postal_code: "06210",
      country: "South Korea",
      is_default: true,
    },
    {
      alias: "Office",
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address_line1: RandomGenerator.paragraph()(5),
      address_line2: "Rm 7F",
      city: "Seoul",
      postal_code: "06210",
      country: "South Korea",
      is_default: false,
    },
  ];

  const createdAddresses: IAimallBackendAddress[] = [];
  for (const input of addressInputs) {
    const address =
      await api.functional.aimall_backend.customer.customers.addresses.create(
        connection,
        {
          customerId: customer.id,
          body: input,
        },
      );
    typia.assert(address);
    createdAddresses.push(address);
  }

  // 3. Retrieve all addresses for this customer
  const page =
    await api.functional.aimall_backend.customer.customers.addresses.index(
      connection,
      {
        customerId: customer.id,
      },
    );
  typia.assert(page);

  // 4. Validate count and that each created address appears with matching fields
  TestValidator.equals("address count matches")(page.data.length)(
    createdAddresses.length,
  );
  for (const created of createdAddresses) {
    const found = page.data.find((addr) => addr.id === created.id);
    TestValidator.predicate("created address present")(!!found);
    if (found) {
      TestValidator.equals("customer id matches")(found.customer_id)(
        customer.id,
      );
      TestValidator.equals("alias matches")(found.alias)(created.alias);
      TestValidator.equals("recipient name matches")(found.recipient_name)(
        created.recipient_name,
      );
      TestValidator.equals("address line1 matches")(found.address_line1)(
        created.address_line1,
      );
      TestValidator.equals("address line2 matches")(found.address_line2)(
        created.address_line2,
      );
      TestValidator.equals("city matches")(found.city)(created.city);
      TestValidator.equals("postal code matches")(found.postal_code)(
        created.postal_code,
      );
      TestValidator.equals("country matches")(found.country)(created.country);
      TestValidator.equals("is_default matches")(found.is_default)(
        created.is_default,
      );
    }
  }
}
