import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import type { IPageIShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_customer_orders_search_empty_result(
  connection: api.IConnection,
) {
  /**
   * Validate that a newly registered customer, who has not placed any orders,
   * receives a properly formatted empty order list from PATCH
   * /shoppingMallAiBackend/customer/orders.
   *
   * Steps:
   *
   * 1. Register (and authenticate) a new customer
   * 2. Query the order list as this customer before any orders exist
   * 3. Assert that no orders are present and the pagination structure is correct
   */
  // Step 1: Register and authenticate new customer
  const registerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: "1234password",
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const joinOutput = await api.functional.auth.customer.join(connection, {
    body: registerInput,
  });
  typia.assert(joinOutput);

  // Step 2: Query order list as the new customer (should be empty)
  const orderSearchInput = {
    page: null,
    limit: null,
    sort: null,
    // 'filter' is optional; not required for an empty search
  } satisfies IShoppingMallAiBackendOrder.IRequest;
  const orderList =
    await api.functional.shoppingMallAiBackend.customer.orders.index(
      connection,
      { body: orderSearchInput },
    );
  typia.assert(orderList);

  // Step 3: Validate the response is an empty paginated structure
  TestValidator.equals(
    "pagination current page is 1",
    orderList.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records is 0",
    orderList.pagination.records,
    0,
  );
  TestValidator.predicate(
    "order data is empty array",
    Array.isArray(orderList.data) && orderList.data.length === 0,
  );
  TestValidator.equals(
    "pagination pages is 1 when empty",
    orderList.pagination.pages,
    1,
  );
}
