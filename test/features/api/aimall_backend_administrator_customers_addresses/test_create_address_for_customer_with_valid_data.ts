import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";

/**
 * Validate that an administrator can add a delivery address for an existing
 * customer, including unique default address logic.
 *
 * Business context: This test ensures that a backend administrator can create
 * delivery addresses for any customer and control the is_default flag. The
 * scenario also covers that only one address can be default (is_default) for
 * the customer, even when multiple addresses are registered in sequence.
 *
 * Process steps:
 *
 * 1. Register a new customer using the official registration API, extracting their
 *    id
 * 2. Add first delivery address with is_default=true, validating all
 *    correspondence of input and output (and correct linkage to customer)
 * 3. Add a second address for same customer with is_default=false, ensure that
 *    is_default logic works as expected
 * 4. Add a third address with is_default=true, confirming again that it is
 *    registered as default according to business/invariant rules
 * 5. (Cannot fetch all addresses to inspect only one default, as no read/fetch-all
 *    API exists for admin, so trust backend for enforcement)
 */
export async function test_api_aimall_backend_administrator_customers_addresses_test_create_address_for_customer_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
    password_hash: null,
    status: "active",
  } satisfies IAimallBackendCustomer.ICreate;
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerInput },
  );
  typia.assert(customer);

  // 2. Add first address (is_default=true)
  const addressInput1 = {
    alias: "Home",
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph()(),
    city: "Seoul",
    postal_code: "12345",
    country: "South Korea",
    is_default: true,
    // address_line2 is optional; omitted here
  } satisfies IAimallBackendAddress.ICreate;
  const address1 =
    await api.functional.aimall_backend.administrator.customers.addresses.create(
      connection,
      { customerId: customer.id, body: addressInput1 },
    );
  typia.assert(address1);
  TestValidator.equals("belongs to customer")(address1.customer_id)(
    customer.id,
  );
  TestValidator.equals("alias matches")(address1.alias)(addressInput1.alias);
  TestValidator.equals("is_default true")(address1.is_default)(true);

  // 3. Add a second address (is_default=false)
  const addressInput2 = {
    alias: "Work",
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph()(),
    address_line2: "Suite 201",
    city: "Seoul",
    postal_code: "54321",
    country: "South Korea",
    is_default: false,
  } satisfies IAimallBackendAddress.ICreate;
  const address2 =
    await api.functional.aimall_backend.administrator.customers.addresses.create(
      connection,
      { customerId: customer.id, body: addressInput2 },
    );
  typia.assert(address2);
  TestValidator.equals("belongs to customer")(address2.customer_id)(
    customer.id,
  );
  TestValidator.equals("alias matches")(address2.alias)(addressInput2.alias);
  TestValidator.equals("is_default false")(address2.is_default)(false);

  // 4. Add a third address with is_default=true (should become the new default)
  const addressInput3 = {
    alias: "Parent's Home",
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph()(),
    address_line2: "Unit 303",
    city: "Busan",
    postal_code: "67890",
    country: "South Korea",
    is_default: true,
  } satisfies IAimallBackendAddress.ICreate;
  const address3 =
    await api.functional.aimall_backend.administrator.customers.addresses.create(
      connection,
      { customerId: customer.id, body: addressInput3 },
    );
  typia.assert(address3);
  TestValidator.equals("belongs to customer")(address3.customer_id)(
    customer.id,
  );
  TestValidator.equals("alias matches")(address3.alias)(addressInput3.alias);
  TestValidator.equals("is_default true")(address3.is_default)(true);
  // Backend should guarantee singleton default; no list/read-all for verification.
}
