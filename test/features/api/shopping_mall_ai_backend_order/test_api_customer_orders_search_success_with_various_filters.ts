import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import type { IPageIShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_customer_orders_search_success_with_various_filters(
  connection: api.IConnection,
) {
  /**
   * E2E test for verifying successful order search with various filters and
   * paginated response.
   *
   * This will verify:
   *
   * 1. Registering a customer and getting fresh authentication context.
   * 2. Creating two orders for this customer with differentiated
   *    status/channel/date/currency.
   * 3. Searching by status (should select only a matching order).
   * 4. Searching by channel (should select only a matching order).
   * 5. Searching by date range (should select only a matching order).
   * 6. Testing pagination (limit=1) returns correct counts for two pages.
   * 7. All returned orders strictly belong to the authenticated customer.
   */

  // 1. Register customer (auto login)
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: "P@ssw0rd" + RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const auth = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(auth);
  const customer = auth.customer;

  // 2. Create 2 distinct orders for this customer
  const channel1 = typia.random<string & tags.Format<"uuid">>();
  const channel2 = typia.random<string & tags.Format<"uuid">>();

  const now = new Date();
  const order1OrderedAt = new Date(now.getTime() - 1000 * 60 * 60 * 24);
  const order2OrderedAt = now;

  const order1Input: IShoppingMallAiBackendOrder.ICreate = {
    shopping_mall_ai_backend_customer_id: customer.id,
    shopping_mall_ai_backend_channel_id: channel1,
    code: RandomGenerator.alphaNumeric(10),
    status: "pending",
    total_amount: 50000,
    currency: "KRW",
    ordered_at: order1OrderedAt.toISOString(),
  };
  const order2Input: IShoppingMallAiBackendOrder.ICreate = {
    shopping_mall_ai_backend_customer_id: customer.id,
    shopping_mall_ai_backend_channel_id: channel2,
    code: RandomGenerator.alphaNumeric(10),
    status: "delivered",
    total_amount: 20000,
    currency: "USD",
    ordered_at: order2OrderedAt.toISOString(),
  };
  const order1 =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      { body: order1Input },
    );
  typia.assert(order1);
  const order2 =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      { body: order2Input },
    );
  typia.assert(order2);

  // 3. Filter by status: expect only order1 returned
  const statusSearch =
    await api.functional.shoppingMallAiBackend.customer.orders.index(
      connection,
      {
        body: { filter: { status: order1.status } },
      },
    );
  typia.assert(statusSearch);
  TestValidator.equals(
    "status filter returns only order1",
    statusSearch.data.map((o) => o.id).sort(),
    [order1.id].sort(),
  );

  // 4. Filter by channel: expect only order2 returned
  const channelSearch =
    await api.functional.shoppingMallAiBackend.customer.orders.index(
      connection,
      {
        body: {
          filter: { channel_id: order2.shopping_mall_ai_backend_channel_id },
        },
      },
    );
  typia.assert(channelSearch);
  TestValidator.equals(
    "channel_id filter returns only order2",
    channelSearch.data.map((o) => o.id).sort(),
    [order2.id].sort(),
  );

  // 5. Filter by ordered_at date: should only get order1
  const from = new Date(order1.ordered_at);
  from.setHours(from.getHours() - 1);
  const to = new Date(order1.ordered_at);
  to.setHours(to.getHours() + 1);
  const dateRangeSearch =
    await api.functional.shoppingMallAiBackend.customer.orders.index(
      connection,
      {
        body: {
          filter: {
            ordered_at_from: from.toISOString(),
            ordered_at_to: to.toISOString(),
          },
        },
      },
    );
  typia.assert(dateRangeSearch);
  TestValidator.equals(
    "ordered_at range filter returns only order1",
    dateRangeSearch.data.map((o) => o.id).sort(),
    [order1.id].sort(),
  );

  // 6. Pagination with limit=1, retrieve two separate pages
  const paged1 =
    await api.functional.shoppingMallAiBackend.customer.orders.index(
      connection,
      {
        body: { page: 1, limit: 1 },
      },
    );
  typia.assert(paged1);
  TestValidator.equals(
    "limit=1 returns 1 record on first page",
    paged1.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paged1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "record is one of two orders",
    paged1.data[0].id === order1.id || paged1.data[0].id === order2.id,
  );

  const paged2 =
    await api.functional.shoppingMallAiBackend.customer.orders.index(
      connection,
      {
        body: { page: 2, limit: 1 },
      },
    );
  typia.assert(paged2);
  TestValidator.equals(
    "limit=1 returns 1 record on page 2",
    paged2.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current page is 2",
    paged2.pagination.current,
    2,
  );
  TestValidator.predicate(
    "record is one of two orders",
    paged2.data[0].id === order1.id || paged2.data[0].id === order2.id,
  );

  // 7. Confirm all results belong only to this customer (should only have our two orders)
  const allSearch =
    await api.functional.shoppingMallAiBackend.customer.orders.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(allSearch);
  TestValidator.predicate(
    "all search results belong to created orders",
    allSearch.data.every((o) => o.id === order1.id || o.id === order2.id),
  );
}
