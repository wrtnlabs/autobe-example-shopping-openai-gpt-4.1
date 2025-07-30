import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";

/**
 * Validate the retrieval of a specific address for a customer by customerId and
 * addressId.
 *
 * Business context: Customers can have multiple saved delivery addresses. To
 * view or edit a specific address, the application retrieves a particular
 * record by the customer's id and the address id, ensuring that the data shown
 * is accurate and belongs to the correct owner.
 *
 * This test verifies that the address retrieval endpoint returns complete and
 * correct address data after the customer and address have both been created.
 *
 * Steps:
 *
 * 1. Create a new customer (using POST /aimall-backend/customers).
 * 2. Register a new address for this customer (using POST
 *    /aimall-backend/customer/customers/{customerId}/addresses).
 * 3. Retrieve this address by customerId and addressId (using GET
 *    /aimall-backend/customer/customers/{customerId}/addresses/{addressId}).
 * 4. Assert that all fields in the retrieved address exactly match what was
 *    originally provided upon address creation.
 */
export async function test_api_aimall_backend_customer_customers_addresses_test_get_customer_address_detail_valid_scenario(
  connection: api.IConnection,
) {
  // 1. Create a new customer
  const randomEmail: string = typia.random<string & tags.Format<"email">>();
  const randomPhone: string = typia.random<string>();
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: randomEmail,
        phone: randomPhone,
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Register a new address for this customer
  const addressBody: IAimallBackendAddress.ICreate = {
    alias: RandomGenerator.pick(["Home", "Office", "Friend"]),
    recipient_name: RandomGenerator.name(),
    phone: randomPhone,
    address_line1: RandomGenerator.pick([
      "123 Seoul Street",
      "77 Gangnam-daero",
      "42 World Cup Ave",
    ]),
    address_line2: RandomGenerator.pick(["Apt 202", "Suite 3B", undefined, ""]),
    city: "Seoul",
    postal_code: RandomGenerator.pick(["06236", "04524", "12345"]),
    country: "South Korea",
    is_default: true,
  };
  const createdAddress =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: addressBody,
      },
    );
  typia.assert(createdAddress);

  // 3. Retrieve this address by customerId and addressId
  const gotAddress =
    await api.functional.aimall_backend.customer.customers.addresses.at(
      connection,
      {
        customerId: customer.id,
        addressId: createdAddress.id,
      },
    );
  typia.assert(gotAddress);

  // 4. Assert that all fields in the retrieved address exactly match creation (ignoring system-generated fields)
  TestValidator.equals("customer_id matches")(gotAddress.customer_id)(
    customer.id,
  );
  TestValidator.equals("alias matches")(gotAddress.alias)(addressBody.alias);
  TestValidator.equals("recipient_name matches")(gotAddress.recipient_name)(
    addressBody.recipient_name,
  );
  TestValidator.equals("phone matches")(gotAddress.phone)(addressBody.phone);
  TestValidator.equals("address_line1 matches")(gotAddress.address_line1)(
    addressBody.address_line1,
  );
  TestValidator.equals("address_line2 matches")(gotAddress.address_line2 ?? "")(
    addressBody.address_line2 ?? "",
  );
  TestValidator.equals("city matches")(gotAddress.city)(addressBody.city);
  TestValidator.equals("postal_code matches")(gotAddress.postal_code)(
    addressBody.postal_code,
  );
  TestValidator.equals("country matches")(gotAddress.country)(
    addressBody.country,
  );
  TestValidator.equals("is_default matches")(gotAddress.is_default)(
    addressBody.is_default,
  );
}
