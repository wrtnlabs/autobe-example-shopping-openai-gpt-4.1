import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";

/**
 * Validate that an authenticated customer can retrieve their own address book
 * with search, filter, sort, and pagination, and that other customers cannot
 * access it.
 *
 * Business context: Customers manage their address books for shipping and
 * billing. Only the owner should access the list. Test validates correct
 * retrieval, filtering, pagination, and access control.
 *
 * Steps:
 *
 * 1. Register a new customer with an initial address.
 * 2. Retrieve their own address list using the JWT token with various filters
 *    (region, is_default, search, paging, sorting), and verify results match
 *    the filters provided and are paginated correctly.
 * 3. Confirm only addresses belonging to the customer are returned.
 * 4. Register a second customer.
 * 5. Attempt to retrieve the first customer’s addresses with the second customer’s
 *    token—ensure access is denied and data is protected.
 */
export async function test_api_customer_address_list_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const address1 = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    region: RandomGenerator.pick(["Seoul", "Busan", "Gyeonggi-do"] as const),
    postal_code: RandomGenerator.alphaNumeric(5),
    address_line1: RandomGenerator.paragraph({ sentences: 1 }),
    address_line2: RandomGenerator.paragraph({ sentences: 1 }),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: address1,
  } satisfies IShoppingMallCustomer.IJoin;
  const custAuth = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert(custAuth);

  // 2. Retrieve their own address list using filtering and pagination
  const requestBodyOwn = {
    customerId: custAuth.id,
    region: address1.region,
    is_default: true,
    search: address1.recipient_name.split(" ")[0],
    page: 1 satisfies number,
    limit: 10 satisfies number,
    sort_by: RandomGenerator.pick(["created_at", "updated_at"] as const),
    order: RandomGenerator.pick(["asc", "desc"] as const),
  } satisfies IShoppingMallCustomerAddress.IRequest;
  const addressPage =
    await api.functional.shoppingMall.customer.customers.addresses.index(
      connection,
      { customerId: custAuth.id, body: requestBodyOwn },
    );
  typia.assert(addressPage);
  TestValidator.predicate(
    "address list has at least 1 address",
    addressPage.data.length >= 1,
  );
  for (const addr of addressPage.data) {
    typia.assert(addr);
    TestValidator.equals(
      "address region matches filter",
      addr.region,
      address1.region,
    );
    TestValidator.equals(
      "address is_default matches filter",
      addr.is_default,
      true,
    );
    TestValidator.equals(
      "address customer_id matches owner",
      addr.customer_id,
      custAuth.id,
    );
    TestValidator.predicate(
      "recipient_name matches search term (partial)",
      addr.recipient_name.includes(requestBodyOwn.search!),
    );
  }

  // 3. Register second customer
  const address2 = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    region: RandomGenerator.pick(["Jeju", "Incheon", "Daejeon"] as const),
    postal_code: RandomGenerator.alphaNumeric(5),
    address_line1: RandomGenerator.paragraph({ sentences: 1 }),
    address_line2: RandomGenerator.paragraph({ sentences: 1 }),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const joinBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: address2,
  } satisfies IShoppingMallCustomer.IJoin;
  const cust2Auth = await api.functional.auth.customer.join(connection, {
    body: joinBody2,
  });
  typia.assert(cust2Auth);

  // 4. Attempt to retrieve first customer's address list with second customer's token (should fail)
  await TestValidator.error(
    "non-owner cannot access another customer's address book",
    async () => {
      await api.functional.shoppingMall.customer.customers.addresses.index(
        connection,
        {
          customerId: custAuth.id,
          body: {
            customerId: custAuth.id,
            page: 1 satisfies number,
            limit: 10 satisfies number,
          } satisfies IShoppingMallCustomerAddress.IRequest,
        },
      );
    },
  );
}
