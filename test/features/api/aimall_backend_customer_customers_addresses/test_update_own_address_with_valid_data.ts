import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";

/**
 * Validate that a customer can update their own address entry.
 *
 * This test verifies the following workflow:
 *
 * 1. Register a new customer
 * 2. Create a delivery address for the customer
 * 3. Update the address fields (recipient, phone, is_default)
 * 4. Confirm the update is reflected in the API response
 * 5. Create a second address for the customer
 * 6. Update the second address to set is_default true, check exclusivity
 * 7. Re-update the first address to set is_default true, and verify the second is
 *    no longer default
 *
 * Note: The API only allows updating one's own addresses. Business rule that
 * only one address can be default is confirmed by toggling is_default between
 * two addresses and checking values reflect exclusivity after each change.
 */
export async function test_api_aimall_backend_customer_customers_addresses_test_update_own_address_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPhone = RandomGenerator.mobile();
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customerEmail,
        phone: customerPhone,
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create initial delivery address
  const addressCreate: IAimallBackendAddress.ICreate = {
    alias: "Home",
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph()(),
    address_line2: "",
    city: "Seoul",
    postal_code: "06236",
    country: "South Korea",
    is_default: false,
  };
  const address: IAimallBackendAddress =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: addressCreate,
      },
    );
  typia.assert(address);

  // 3. Update the address fields
  const updatedPhone = RandomGenerator.mobile();
  const updatedRecipient = RandomGenerator.name();
  const updatedAt = new Date().toISOString();
  const updateInput: IAimallBackendAddress.IUpdate = {
    alias: address.alias,
    recipient_name: updatedRecipient,
    phone: updatedPhone,
    address_line1: address.address_line1,
    address_line2: address.address_line2 ?? null,
    city: address.city,
    postal_code: address.postal_code,
    country: address.country,
    is_default: true,
    updated_at: updatedAt,
  };
  const updated: IAimallBackendAddress =
    await api.functional.aimall_backend.customer.customers.addresses.update(
      connection,
      {
        customerId: customer.id,
        addressId: address.id,
        body: updateInput,
      },
    );
  typia.assert(updated);
  TestValidator.equals("address updated phone")(updated.phone)(updatedPhone);
  TestValidator.equals("address updated recipient")(updated.recipient_name)(
    updatedRecipient,
  );
  TestValidator.equals("address is_default true")(updated.is_default)(true);

  // 4. Create second address
  const secondAddressCreate: IAimallBackendAddress.ICreate = {
    alias: "Work",
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph()(),
    address_line2: "Suite 101",
    city: "Seoul",
    postal_code: "06236",
    country: "South Korea",
    is_default: false,
  };
  const secondAddress: IAimallBackendAddress =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: secondAddressCreate,
      },
    );
  typia.assert(secondAddress);

  // 5. Update second address to set as default
  const updateSecondAddress: IAimallBackendAddress.IUpdate = {
    alias: secondAddress.alias,
    recipient_name: secondAddress.recipient_name,
    phone: secondAddress.phone,
    address_line1: secondAddress.address_line1,
    address_line2: secondAddress.address_line2 ?? null,
    city: secondAddress.city,
    postal_code: secondAddress.postal_code,
    country: secondAddress.country,
    is_default: true,
    updated_at: new Date().toISOString(),
  };
  const updatedSecond: IAimallBackendAddress =
    await api.functional.aimall_backend.customer.customers.addresses.update(
      connection,
      {
        customerId: customer.id,
        addressId: secondAddress.id,
        body: updateSecondAddress,
      },
    );
  typia.assert(updatedSecond);
  TestValidator.equals("second address is_default true")(
    updatedSecond.is_default,
  )(true);

  // 6. Re-update the first address to set is_default true; check exclusivity
  const reUpdateFirst: IAimallBackendAddress.IUpdate = {
    alias: address.alias,
    recipient_name: updatedRecipient,
    phone: updatedPhone,
    address_line1: address.address_line1,
    address_line2: address.address_line2 ?? null,
    city: address.city,
    postal_code: address.postal_code,
    country: address.country,
    is_default: true,
    updated_at: new Date().toISOString(),
  };
  const firstNowDefault: IAimallBackendAddress =
    await api.functional.aimall_backend.customer.customers.addresses.update(
      connection,
      {
        customerId: customer.id,
        addressId: address.id,
        body: reUpdateFirst,
      },
    );
  typia.assert(firstNowDefault);
  TestValidator.equals("first address is_default true again")(
    firstNowDefault.is_default,
  )(true);

  // 7. Confirm second address is no longer default
  const verifySecond: IAimallBackendAddress.IUpdate = {
    alias: secondAddress.alias,
    recipient_name: secondAddress.recipient_name,
    phone: secondAddress.phone,
    address_line1: secondAddress.address_line1,
    address_line2: secondAddress.address_line2 ?? null,
    city: secondAddress.city,
    postal_code: secondAddress.postal_code,
    country: secondAddress.country,
    is_default: false,
    updated_at: new Date().toISOString(),
  };
  const secondNoLongerDefault: IAimallBackendAddress =
    await api.functional.aimall_backend.customer.customers.addresses.update(
      connection,
      {
        customerId: customer.id,
        addressId: secondAddress.id,
        body: verifySecond,
      },
    );
  typia.assert(secondNoLongerDefault);
  TestValidator.equals("second address is_default false")(
    secondNoLongerDefault.is_default,
  )(false);
}
