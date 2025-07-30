import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";

/**
 * Validate that an administrator can retrieve a specific customer address by
 * addressId using the admin API.
 *
 * Business context: This test simulates a real admin workflow for address
 * management. Administrators often need to view or update customer delivery
 * addresses for support or auditing, and must be able to fetch full address
 * detail by ID. It's critical that all general data is present, while no
 * admin-facing information is omitted.
 *
 * Steps:
 *
 * 1. Register a new test customer via the backend (admin scope).
 * 2. Register an address for that customer as administrator.
 * 3. Retrieve the address by customerId and addressId as admin.
 * 4. Confirm all key fields are returned and accurate.
 * 5. Ensure the full admin detail DTO shape is present (no omissions).
 */
export async function test_api_aimall_backend_administrator_customers_addresses_test_admin_get_address_by_addressId_valid(
  connection: api.IConnection,
) {
  // 1. Create a sample customer (admin flow)
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: RandomGenerator.alphaNumeric(32),
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 2. Add an address for the created customer as admin
  const addressInput = {
    alias: "Test Home",
    recipient_name: RandomGenerator.name(),
    phone: typia.random<string>(),
    address_line1: "123 E2E Test Road",
    address_line2: "Suite 112",
    city: "Seoul",
    postal_code: "06236",
    country: "South Korea",
    is_default: true,
  } satisfies IAimallBackendAddress.ICreate;
  const createdAddress =
    await api.functional.aimall_backend.administrator.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: addressInput,
      },
    );
  typia.assert(createdAddress);

  // 3. Retrieve the address by customerId and addressId as admin
  const gotAddress =
    await api.functional.aimall_backend.administrator.customers.addresses.at(
      connection,
      {
        customerId: customer.id,
        addressId: createdAddress.id,
      },
    );
  typia.assert(gotAddress);

  // 4. Assert all returned fields match the created resource
  TestValidator.equals("alias matches")(gotAddress.alias)(createdAddress.alias);
  TestValidator.equals("recipient name matches")(gotAddress.recipient_name)(
    createdAddress.recipient_name,
  );
  TestValidator.equals("phone matches")(gotAddress.phone)(createdAddress.phone);
  TestValidator.equals("address line1 matches")(gotAddress.address_line1)(
    createdAddress.address_line1,
  );
  TestValidator.equals("address line2 matches")(gotAddress.address_line2)(
    createdAddress.address_line2,
  );
  TestValidator.equals("city matches")(gotAddress.city)(createdAddress.city);
  TestValidator.equals("postal code matches")(gotAddress.postal_code)(
    createdAddress.postal_code,
  );
  TestValidator.equals("country matches")(gotAddress.country)(
    createdAddress.country,
  );
  TestValidator.equals("is_default matches")(gotAddress.is_default)(
    createdAddress.is_default,
  );
  TestValidator.equals("customer_id matches")(gotAddress.customer_id)(
    customer.id,
  );

  // 5. Confirm full required DTO contract for admin use is present
  typia.assert<IAimallBackendAddress>(gotAddress);
}
