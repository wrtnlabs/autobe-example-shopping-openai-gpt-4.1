import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";
import type { IPageIAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrderItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates advanced search and filter functionalities for seller order items
 * in an owned order.
 *
 * This E2E test covers the following sequence:
 *
 * 1. Create an order as a seller (parent entity for order items to be
 *    filtered/searched)
 * 2. Add multiple (at least two) distinct order items to the order, varying
 *    product_id, product_option_id, and quantity for comprehensive filter
 *    coverage.
 * 3. Search the order items using exact product_id, SKU/option (product_option_id)
 *    filters, and expect output to match those filters and reflect correct
 *    pagination meta.
 * 4. Search with an invalid product_id for this order and assert the result is
 *    empty.
 * 5. Attempt to search order items for an order as a seller that does not own it
 *    (simulate with fake UUID), verify API returns an error.
 */
export async function test_api_aimall_backend_test_seller_advanced_search_filter_order_items(
  connection: api.IConnection,
) {
  // 1. Create an order as seller
  const order_input: IAimallBackendOrder.ICreate = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_number: undefined, // Let backend generate
    order_status: "pending",
    total_amount: 200000,
    currency: "KRW",
  };
  const order = await api.functional.aimall_backend.seller.orders.create(
    connection,
    { body: order_input },
  );
  typia.assert(order);

  // 2. Add multiple distinct order items (different product_id, product_option_id, quantity)
  const item_inputs: IAimallBackendOrderItem.ICreate[] = [
    {
      product_id: typia.random<string & tags.Format<"uuid">>(),
      product_option_id: typia.random<string & tags.Format<"uuid">>(),
      item_name: "Red T-Shirt Large",
      quantity: 5,
      unit_price: 10000,
      total_price: 50000,
    },
    {
      product_id: typia.random<string & tags.Format<"uuid">>(),
      product_option_id: typia.random<string & tags.Format<"uuid">>(),
      item_name: "Blue Jeans Medium",
      quantity: 2,
      unit_price: 50000,
      total_price: 100000,
    },
    {
      product_id: typia.random<string & tags.Format<"uuid">>(),
      product_option_id: null,
      item_name: "Black Belt",
      quantity: 1,
      unit_price: 50000,
      total_price: 50000,
    },
  ];
  const created_items: IAimallBackendOrderItem[] = [];
  for (const input of item_inputs) {
    const item =
      await api.functional.aimall_backend.seller.orders.orderItems.create(
        connection,
        {
          orderId: order.id,
          body: input,
        },
      );
    typia.assert(item);
    created_items.push(item);
  }

  // 3a. Search/filter by product_id (should yield 1)
  {
    const search_body: IAimallBackendOrderItem.IRequest = {
      order_id: order.id,
      product_id: created_items[0].product_id,
    };
    const resp =
      await api.functional.aimall_backend.seller.orders.orderItems.search(
        connection,
        {
          orderId: order.id,
          body: search_body,
        },
      );
    typia.assert(resp);
    TestValidator.predicate("Exactly 1 filtered by product_id")(
      resp.data.length === 1,
    );
    TestValidator.equals("filter product_id matches")(resp.data[0].product_id)(
      created_items[0].product_id,
    );
  }

  // 3b. Filter by product_option_id (should yield 1)
  {
    const search_body: IAimallBackendOrderItem.IRequest = {
      order_id: order.id,
      product_option_id: created_items[1].product_option_id,
    };
    const resp =
      await api.functional.aimall_backend.seller.orders.orderItems.search(
        connection,
        {
          orderId: order.id,
          body: search_body,
        },
      );
    typia.assert(resp);
    TestValidator.predicate("Exactly 1 filtered by product_option_id")(
      resp.data.length === 1,
    );
    TestValidator.equals("filter product_option_id matches")(
      resp.data[0].product_option_id,
    )(created_items[1].product_option_id);
  }

  // 3c. Find by quantity (since quantity is not an allowed search param, get all then filter)
  {
    const quantity_to_find = created_items[2].quantity;
    const search_body: IAimallBackendOrderItem.IRequest = {
      order_id: order.id,
    };
    const resp =
      await api.functional.aimall_backend.seller.orders.orderItems.search(
        connection,
        {
          orderId: order.id,
          body: { ...search_body },
        },
      );
    typia.assert(resp);
    const matches = resp.data.filter((i) => i.quantity === quantity_to_find);
    TestValidator.predicate("Should find at least one with matching quantity")(
      matches.length > 0,
    );
    TestValidator.equals("quantity matches")(matches[0].quantity)(
      quantity_to_find,
    );
  }

  // 3d. Test pagination (limit=1 page=2)
  {
    const search_body: IAimallBackendOrderItem.IRequest = {
      order_id: order.id,
      page: 2,
      limit: 1,
    };
    const resp =
      await api.functional.aimall_backend.seller.orders.orderItems.search(
        connection,
        {
          orderId: order.id,
          body: search_body,
        },
      );
    typia.assert(resp);
    TestValidator.equals("pagination limit")(resp.pagination.limit)(1);
    TestValidator.equals("pagination current page")(resp.pagination.current)(2);
    TestValidator.predicate("at most 1 item on page")(resp.data.length <= 1);
  }

  // 4. Search by invalid product_id (should yield 0 results)
  {
    const search_body: IAimallBackendOrderItem.IRequest = {
      order_id: order.id,
      product_id: typia.random<string & tags.Format<"uuid">>(),
    };
    const resp =
      await api.functional.aimall_backend.seller.orders.orderItems.search(
        connection,
        {
          orderId: order.id,
          body: search_body,
        },
      );
    typia.assert(resp);
    TestValidator.equals("empty array on invalid product_id")(resp.data.length)(
      0,
    );
    TestValidator.equals("0 records on invalid product_id")(
      resp.pagination.records,
    )(0);
  }

  // 5. Search for order not owned (simulate with new UUID as order_id)
  await TestValidator.error("Unauthorized or forbidden for wrong order_id")(
    async () => {
      await api.functional.aimall_backend.seller.orders.orderItems.search(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            order_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );
}
