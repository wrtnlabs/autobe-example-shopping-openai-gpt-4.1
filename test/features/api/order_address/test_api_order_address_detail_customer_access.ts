import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";

/**
 * Validate that customers can retrieve their own order address snapshot in
 * detail.
 *
 * This test will:
 *
 * 1. Register a new customer, providing a realistic address.
 * 2. As the authenticated customer, create an order address snapshot for a
 *    hypothetical order.
 * 3. Fetch the detail of the snapshot just created.
 * 4. Assert that all primary address and audit fields exactly match what was
 *    submitted and that the response structure matches schema.
 */
export async function test_api_order_address_detail_customer_access(
  connection: api.IConnection,
) {
  // 1. Register customer with realistic address (for authentication)
  const baseAddress = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    region: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 10,
    }),
    postal_code: RandomGenerator.alphaNumeric(5),
    address_line1: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 12,
    }),
    address_line2: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 15,
    }),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const joinOutput: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address: baseAddress,
      },
    });
  typia.assert(joinOutput);

  // 2. Create an order address snapshot (imitate order placement)
  //   Use fields similar to profile address, but update address_type and country_code
  const createReq = {
    address_type: "shipping",
    recipient_name: baseAddress.recipient_name,
    phone: baseAddress.phone,
    zip_code: baseAddress.postal_code,
    address_main: baseAddress.address_line1,
    address_detail: baseAddress.address_line2,
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;

  const created: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: createReq,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "order address type",
    created.address_type,
    createReq.address_type,
  );
  TestValidator.equals(
    "order address recipient_name",
    created.recipient_name,
    createReq.recipient_name,
  );
  TestValidator.equals(
    "order address zip_code",
    created.zip_code,
    createReq.zip_code,
  );
  TestValidator.equals(
    "order address address_main",
    created.address_main,
    createReq.address_main,
  );
  TestValidator.equals(
    "order address address_detail",
    created.address_detail,
    createReq.address_detail,
  );
  TestValidator.equals(
    "order address country_code",
    created.country_code,
    createReq.country_code,
  );
  TestValidator.predicate(
    "order address id is uuid",
    typeof created.id === "string" && /^[0-9a-f\-]{36}$/i.test(created.id),
  );
  TestValidator.predicate(
    "order address created_at is valid date-time",
    /T.*Z$/.test(created.created_at),
  );

  // 3. Retrieve the snapshot detail and check point-in-time data
  const retrieved: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.at(connection, {
      orderAddressId: created.id,
    });
  typia.assert(retrieved);
  TestValidator.equals(
    "order address snapshot retrieval matches created",
    retrieved,
    created,
  );
}
