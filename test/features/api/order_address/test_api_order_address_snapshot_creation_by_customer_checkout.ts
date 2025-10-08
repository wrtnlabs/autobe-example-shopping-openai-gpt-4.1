import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";

/**
 * Validate the creation of an immutable order address snapshot by a customer
 * during checkout.
 *
 * 1. Register a new customer (establishes authentication context)
 * 2. Generate valid random data for the order address snapshot
 * 3. Call the order address snapshot creation endpoint as the authenticated
 *    customer
 * 4. Assert that the response reflects the immutable snapshot with all submitted
 *    fields (id, recipient, address, phone, zip, etc.)
 * 5. Ensure the returned address is immutable (business logic: there is no
 *    endpoint to update/delete order addresses)
 */
export async function test_api_order_address_snapshot_creation_by_customer_checkout(
  connection: api.IConnection,
) {
  // 1. Register a new customer with an initial address
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const joinAddress = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    region: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphabets(5),
    address_line1: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 8,
    }),
    address_line2: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 6,
    }),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const joinInput = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: joinAddress,
  } satisfies IShoppingMallCustomer.IJoin;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinInput,
    });
  typia.assert(customer);
  TestValidator.equals(
    "registered customer email matches",
    customer.email,
    customerEmail,
  );

  // 2. Prepare a new order address snapshot for checkout
  const orderAddressCreate = {
    address_type: RandomGenerator.pick([
      "shipping",
      "billing",
      "both",
    ] as const),
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    address_main: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 12,
    }),
    address_detail: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 10,
    }),
    country_code: RandomGenerator.pick(["KOR", "USA", "JPN", "CHN"] as const),
  } satisfies IShoppingMallOrderAddress.ICreate;

  // 3. Call the address snapshot creation endpoint, receive immutable record
  const createdSnapshot: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      { body: orderAddressCreate },
    );
  typia.assert(createdSnapshot);

  // 4. Assert all fields match (except id/created_at, which are generated)
  TestValidator.equals(
    "address_type matches",
    createdSnapshot.address_type,
    orderAddressCreate.address_type,
  );
  TestValidator.equals(
    "recipient_name matches",
    createdSnapshot.recipient_name,
    orderAddressCreate.recipient_name,
  );
  TestValidator.equals(
    "phone matches",
    createdSnapshot.phone,
    orderAddressCreate.phone,
  );
  TestValidator.equals(
    "zip_code matches",
    createdSnapshot.zip_code,
    orderAddressCreate.zip_code,
  );
  TestValidator.equals(
    "address_main matches",
    createdSnapshot.address_main,
    orderAddressCreate.address_main,
  );
  TestValidator.equals(
    "address_detail matches",
    createdSnapshot.address_detail,
    orderAddressCreate.address_detail,
  );
  TestValidator.equals(
    "country_code matches",
    createdSnapshot.country_code,
    orderAddressCreate.country_code,
  );
  TestValidator.predicate(
    "id is UUID",
    typeof createdSnapshot.id === "string" &&
      /^[0-9a-f-]{36}$/i.test(createdSnapshot.id),
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof createdSnapshot.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(
        createdSnapshot.created_at,
      ),
  );

  // 5. Assert address is immutable (no edit/delete endpoints)
  // This is ensured by API contract; to confirm, attempt forbidden operations should be error-checked (if such endpoints existed)
}
