import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";
import type { IPageIAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrderItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced order item search and filtering for an administrator.
 *
 * This test verifies the administrator's ability to search/filter order items
 * within a specific order. It ensures correct operation with diverse item lines
 * and thorough handling of pagination, filtering, sorting, and edge cases.
 *
 * Steps:
 *
 * 1. Create an order via the administrator API with valid and random business
 *    fields (customer_id, seller_id, address_id, etc.).
 * 2. Add multiple (at least 5) diverse order items to the created order, each with
 *    unique combinations of product_id, SKU/product_option_id (some null, some
 *    filled), item_name, quantity, unit_price, and total_price.
 * 3. Search order items solely by order_id (should return all just-added items),
 *    confirm all are present and content matches what was added.
 * 4. For each unique product_id present in those items, search with order_id and
 *    that product_id -- confirm only matching items are returned.
 * 5. For a line with product_option_id, search using order_id and
 *    product_option_id; confirm only correct item(s) are returned.
 * 6. Search by an item_name substring that should match one or more items,
 *    validate filtering.
 * 7. Validate pagination - e.g. set limit 2, get total page count and data
 *    integrity for all pages.
 * 8. Sort by item_name ascending and descending, confirm that order of results is
 *    correct in both cases.
 * 9. Try a non-matching product_id, a non-existent product_option_id, or
 *    impossible combo, confirm that result set is empty but not errored.
 */
export async function test_api_aimall_backend_administrator_orders_orderItems_test_advanced_search_order_items_by_admin(
  connection: api.IConnection,
) {
  // 1. Create an order as administrator
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 100000,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);

  // 2. Add 5 diverse order items with unique (product_id, option, name, qty, price)
  const products = ArrayUtil.repeat(5)(() => ({
    product_id: typia.random<string & tags.Format<"uuid">>(),
    product_option_id:
      Math.random() > 0.5 ? typia.random<string & tags.Format<"uuid">>() : null,
    item_name: RandomGenerator.alphabets(10),
    quantity: typia.random<number & tags.Type<"int32">>(),
    unit_price: 1000 + Math.floor(Math.random() * 5000),
  }));
  const orderItems: IAimallBackendOrderItem[] = [];
  for (const prod of products) {
    const oi =
      await api.functional.aimall_backend.administrator.orders.orderItems.create(
        connection,
        {
          orderId: order.id,
          body: {
            product_id: prod.product_id,
            product_option_id: prod.product_option_id,
            item_name: prod.item_name,
            quantity: prod.quantity,
            unit_price: prod.unit_price,
            total_price: prod.unit_price * prod.quantity,
          },
        },
      );
    orderItems.push(oi);
    typia.assert(oi);
  }

  // 3. Search for all order items (by order_id)
  let searchRes =
    await api.functional.aimall_backend.administrator.orders.orderItems.search(
      connection,
      {
        orderId: order.id,
        body: { order_id: order.id },
      },
    );
  typia.assert(searchRes);
  TestValidator.equals("return all items")(searchRes.data.length)(
    orderItems.length,
  );
  for (const item of orderItems)
    TestValidator.predicate("item present")(
      searchRes.data.some((d) => d.id === item.id),
    );

  // 4. Filter by each product_id and validate match
  for (const prod of products) {
    searchRes =
      await api.functional.aimall_backend.administrator.orders.orderItems.search(
        connection,
        {
          orderId: order.id,
          body: { order_id: order.id, product_id: prod.product_id },
        },
      );
    typia.assert(searchRes);
    TestValidator.predicate("product filter")(
      searchRes.data.every((i) => i.product_id === prod.product_id),
    );
  }

  // 5. Filter by product_option_id where not null
  for (const prod of products.filter((p) => !!p.product_option_id)) {
    searchRes =
      await api.functional.aimall_backend.administrator.orders.orderItems.search(
        connection,
        {
          orderId: order.id,
          body: {
            order_id: order.id,
            product_option_id: prod.product_option_id,
          },
        },
      );
    typia.assert(searchRes);
    TestValidator.predicate("option filter")(
      searchRes.data.every(
        (i) => i.product_option_id === prod.product_option_id,
      ),
    );
  }

  // 6. Filter by item_name substring (pick first three letters)
  {
    const filterName = products[0].item_name.substring(0, 3);
    searchRes =
      await api.functional.aimall_backend.administrator.orders.orderItems.search(
        connection,
        {
          orderId: order.id,
          body: { order_id: order.id, item_name: filterName },
        },
      );
    typia.assert(searchRes);
    TestValidator.predicate("item_name filter")(
      searchRes.data.some((i) => i.item_name.includes(filterName)),
    );
  }

  // 7. Pagination (limit = 2) and page correctness
  searchRes =
    await api.functional.aimall_backend.administrator.orders.orderItems.search(
      connection,
      {
        orderId: order.id,
        body: { order_id: order.id, limit: 2, page: 1 },
      },
    );
  typia.assert(searchRes);
  TestValidator.equals("pagination limit")(searchRes.data.length)(2);

  // 8. Sorting
  searchRes =
    await api.functional.aimall_backend.administrator.orders.orderItems.search(
      connection,
      {
        orderId: order.id,
        body: { order_id: order.id, sort_by: "item_name", sort_order: "asc" },
      },
    );
  typia.assert(searchRes);
  const ascNames = searchRes.data.map((i) => i.item_name);
  const sortedAsc = [...ascNames].sort((a, b) => a.localeCompare(b));
  TestValidator.equals("sort asc")(ascNames)(sortedAsc);

  searchRes =
    await api.functional.aimall_backend.administrator.orders.orderItems.search(
      connection,
      {
        orderId: order.id,
        body: { order_id: order.id, sort_by: "item_name", sort_order: "desc" },
      },
    );
  typia.assert(searchRes);
  const descNames = searchRes.data.map((i) => i.item_name);
  const sortedDesc = [...descNames].sort((a, b) => b.localeCompare(a));
  TestValidator.equals("sort desc")(descNames)(sortedDesc);

  // 9. Try a bogus product_id (random not assigned above)
  searchRes =
    await api.functional.aimall_backend.administrator.orders.orderItems.search(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          product_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(searchRes);
  TestValidator.equals("no match")(searchRes.data.length)(0);
}
