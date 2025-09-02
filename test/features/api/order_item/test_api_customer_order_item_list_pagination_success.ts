import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import type { IShoppingMallAiBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderItem";
import type { IPageIShoppingMallAiBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_customer_order_item_list_pagination_success(
  connection: api.IConnection,
) {
  /**
   * Validate that an authenticated customer can list and paginate/filter order
   * items for their own order.
   *
   * Workflow:
   *
   * 1. Customer joins (auth context established)
   * 2. Customer creates an order (with random, business-acceptable DTO fields)
   * 3. Retrieve order items with no filters (should show all items for the order)
   * 4. Test pagination (limit 1, page 2)
   * 5. Test filtering by product_id if available
   * 6. Test filtering by status if available
   * 7. Edge case: request page beyond the end (should return zero results)
   */

  // 1. Register new customer and establish authentication context
  const customerJoinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerJoinInput,
  });
  typia.assert(customerAuth);
  const customerId = typia.assert(customerAuth.customer.id);

  // 2. Customer creates an order
  const orderCreateInput: IShoppingMallAiBackendOrder.ICreate = {
    shopping_mall_ai_backend_customer_id: customerId,
    shopping_mall_ai_backend_channel_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    shopping_mall_ai_backend_seller_id: null,
    code: RandomGenerator.alphaNumeric(8),
    status: "pending",
    total_amount: 100000,
    currency: "KRW",
    ordered_at: new Date().toISOString(),
    confirmed_at: null,
    cancelled_at: null,
    closed_at: null,
  };
  const order =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      { body: orderCreateInput },
    );
  typia.assert(order);
  const orderId = typia.assert(order.id);

  // 3. Retrieve all items for this order (no filters)
  const noFilterList =
    await api.functional.shoppingMallAiBackend.customer.orders.items.index(
      connection,
      { orderId, body: {} satisfies IShoppingMallAiBackendOrderItem.IRequest },
    );
  typia.assert(noFilterList);
  TestValidator.predicate(
    "all items have correct orderId",
    noFilterList.data.every((item) => item.order_id === orderId),
  );

  // 4. Pagination test - get 1 result per page, check page 1 & page 2
  const paged1 =
    await api.functional.shoppingMallAiBackend.customer.orders.items.index(
      connection,
      {
        orderId,
        body: { limit: 1 } satisfies IShoppingMallAiBackendOrderItem.IRequest,
      },
    );
  typia.assert(paged1);
  TestValidator.equals("pagination limit is 1", paged1.pagination.limit, 1);
  const paged2 =
    await api.functional.shoppingMallAiBackend.customer.orders.items.index(
      connection,
      {
        orderId,
        body: {
          limit: 1,
          page: 2,
        } satisfies IShoppingMallAiBackendOrderItem.IRequest,
      },
    );
  typia.assert(paged2);
  TestValidator.equals("pagination page is 2", paged2.pagination.current, 2);

  // 5. Filtering by product_id (if there are items)
  if (noFilterList.data.length > 0) {
    const productId = noFilterList.data[0].product_id;
    const filterByProduct =
      await api.functional.shoppingMallAiBackend.customer.orders.items.index(
        connection,
        {
          orderId,
          body: {
            product_id: productId,
          } satisfies IShoppingMallAiBackendOrderItem.IRequest,
        },
      );
    typia.assert(filterByProduct);
    TestValidator.predicate(
      "all filtered items have correct product_id",
      filterByProduct.data.every((item) => item.product_id === productId),
    );
  }

  // 6. Filtering by status (if there are items)
  if (noFilterList.data.length > 0) {
    const status = noFilterList.data[0].status;
    const filterByStatus =
      await api.functional.shoppingMallAiBackend.customer.orders.items.index(
        connection,
        {
          orderId,
          body: { status } satisfies IShoppingMallAiBackendOrderItem.IRequest,
        },
      );
    typia.assert(filterByStatus);
    TestValidator.predicate(
      "all filtered items have correct status",
      filterByStatus.data.every((item) => item.status === status),
    );
  }

  // 7. Edge case test: page beyond last page (should have no results)
  const lastPage = noFilterList.pagination.pages;
  const emptyPage =
    await api.functional.shoppingMallAiBackend.customer.orders.items.index(
      connection,
      {
        orderId,
        body: {
          page: lastPage + 1,
        } satisfies IShoppingMallAiBackendOrderItem.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("page beyond last is empty", emptyPage.data.length, 0);
}
