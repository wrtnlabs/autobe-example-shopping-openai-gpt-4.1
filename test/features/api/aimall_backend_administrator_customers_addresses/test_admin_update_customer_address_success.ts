import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";

/**
 * Validate that an administrator can update any customer delivery address for
 * support or compliance.
 *
 * Scenario:
 *
 * 1. Register a customer via POST /aimall-backend/customers
 * 2. Add an address for the new customer via POST
 *    /aimall-backend/customer/customers/{customerId}/addresses
 * 3. As admin, update that address via PUT
 *    /aimall-backend/administrator/customers/{customerId}/addresses/{addressId}
 *    (changing fields such as alias, recipient_name, and is_default)
 * 4. Validate the API response reflects the new values, and address id/customer
 *    association persists
 * 5. Verify updated_at is refreshed (greater than previous value)
 *
 * (Fetching the full updated address list is skipped as there is no SDK
 * endpoint for listing addresses.)
 */
export async function test_api_aimall_backend_administrator_customers_addresses_test_admin_update_customer_address_success(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const customerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    password_hash: null,
    status: "active",
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerInput },
  );
  typia.assert(customer);

  // 2. Create a delivery address for the customer
  const addressInput: IAimallBackendAddress.ICreate = {
    alias: "Home",
    recipient_name: "John Doe",
    phone: typia.random<string>(),
    address_line1: "1234 Main St",
    city: "Seoul",
    postal_code: "06234",
    country: "South Korea",
    is_default: false,
  };
  const address =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      { customerId: customer.id, body: addressInput },
    );
  typia.assert(address);

  // 3. As admin, update the address (fix typo, set as default, etc)
  const updateInput: IAimallBackendAddress.IUpdate = {
    alias: "Primary Home",
    recipient_name: "Johnathon Doe",
    phone: address.phone,
    address_line1: address.address_line1,
    address_line2: null,
    city: address.city,
    postal_code: address.postal_code,
    country: address.country,
    is_default: true,
    updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
  };
  const updated =
    await api.functional.aimall_backend.administrator.customers.addresses.update(
      connection,
      {
        customerId: customer.id,
        addressId: address.id,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 4. Assert major mutations and that IDs remain unchanged
  TestValidator.equals("recipient_name updated")(updated.recipient_name)(
    "Johnathon Doe",
  );
  TestValidator.equals("alias updated")(updated.alias)("Primary Home");
  TestValidator.equals("is_default updated")(updated.is_default)(true);
  TestValidator.equals("customer_id persists")(updated.customer_id)(
    customer.id,
  );
  TestValidator.equals("address_id persists")(updated.id)(address.id);
  TestValidator.predicate("timestamp updated")(
    Date.parse(updated.updated_at) > Date.parse(address.updated_at),
  );
}
