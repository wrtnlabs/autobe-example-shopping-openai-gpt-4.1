import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";

/**
 * Test invalid address update scenarios: invalid phone format and duplicate
 * alias.
 *
 * This test verifies that the API correctly rejects updates that violate
 * business-validation rules for customer addresses, specifically for invalid
 * phone numbers and duplicate alias within the same customer. The test ensures
 * strict type safety throughout and that such updates are rejected without
 * modifying the address data.
 *
 * Steps:
 *
 * 1. Register a new customer.
 * 2. Create a valid address for that customer.
 * 3. Attempt to update the address with: a. Invalid phone number b. Alias that
 *    duplicates another address's alias for the same customer
 * 4. Confirm that invalid updates fail. (Cannot verify record unchanged due to
 *    lack of GET API)
 */
export async function test_api_customer_customers_addresses_test_update_address_with_invalid_data_should_fail(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a valid address for the customer
  const address =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Home",
          recipient_name: "John Tester",
          phone: "01012345678",
          address_line1: "123 Test Street",
          address_line2: "Apt 1",
          city: "Seoul",
          postal_code: "06234",
          country: "KR",
          is_default: true,
        } satisfies IAimallBackendAddress.ICreate,
      },
    );
  typia.assert(address);

  // 3a. Attempt to update with an invalid phone number
  await TestValidator.error("invalid phone number should fail")(async () => {
    await api.functional.aimall_backend.customer.customers.addresses.update(
      connection,
      {
        customerId: customer.id,
        addressId: address.id,
        body: {
          alias: address.alias,
          recipient_name: address.recipient_name,
          phone: "NOTAPHONE",
          address_line1: address.address_line1,
          address_line2: address.address_line2,
          city: address.city,
          postal_code: address.postal_code,
          country: address.country,
          is_default: address.is_default,
          updated_at: typia.random<string & tags.Format<"date-time">>(),
        } satisfies IAimallBackendAddress.IUpdate,
      },
    );
  });

  // 3b. Attempt duplicate alias for same customer
  // First, create a second address with a different alias
  const address2 =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Work",
          recipient_name: "John Tester",
          phone: "01087654321",
          address_line1: "456 Work Street",
          address_line2: "Suite 77",
          city: "Seoul",
          postal_code: "06234",
          country: "KR",
          is_default: false,
        } satisfies IAimallBackendAddress.ICreate,
      },
    );
  typia.assert(address2);

  // Now, attempt to update first address's alias to "Work" (should fail)
  await TestValidator.error("duplicate alias should fail")(async () => {
    await api.functional.aimall_backend.customer.customers.addresses.update(
      connection,
      {
        customerId: customer.id,
        addressId: address.id,
        body: {
          alias: address2.alias,
          recipient_name: address.recipient_name,
          phone: address.phone,
          address_line1: address.address_line1,
          address_line2: address.address_line2,
          city: address.city,
          postal_code: address.postal_code,
          country: address.country,
          is_default: address.is_default,
          updated_at: typia.random<string & tags.Format<"date-time">>(),
        } satisfies IAimallBackendAddress.IUpdate,
      },
    );
  });

  // 4. Cannot verify record unchanged due to lack of GET API
}
