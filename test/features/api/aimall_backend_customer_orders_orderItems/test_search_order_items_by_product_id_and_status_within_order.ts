import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";
import type { IPageIAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrderItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Advanced search and filtering for customer order items by product ID and item
 * name substring.
 *
 * Purpose:
 *
 * - To validate advanced order item querying for a customer's order, ensuring
 *   that filtering and pagination work as intended.
 * - Since the order item schema lacks a 'status' field, we test search by
 *   'product_id' and 'item_name' substring.
 * - This simulates a customer auditing their order, including specific queries
 *   for products, names, and pagination edge cases.
 *
 * Steps:
 *
 * 1. Create a new order for a random customer, seller, and address UUID.
 * 2. Add four order items with different properties:
 *
 *    - At least two items share a product_id.
 *    - Item names include a known substring for targeted filtering.
 * 3. Search for order items by product_id and verify only matching items are
 *    returned, and others excluded.
 * 4. Search for an item using both product_id and partial item_name, expect only a
 *    single match.
 * 5. Verify search with a non-existent product_id returns an empty result set.
 * 6. Test pagination by limiting results to 2 per page and validate pagination
 *    metadata.
 */
export async function test_api_aimall_backend_customer_orders_orderItems_search_by_product_id_and_item_name(
  connection: api.IConnection,
) {
  // 1. Create a new order
  const customer_id = typia.random<string & tags.Format<"uuid">>();
  const seller_id = typia.random<string & tags.Format<"uuid">>();
  const address_id = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id,
        seller_id,
        address_id,
        order_status: "pending",
        total_amount: 100_000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 2. Add 4 order items: at least 2 share a product_id, all unique item_names
  const shared_product_id = typia.random<string & tags.Format<"uuid">>();
  const unique_product_id_1 = typia.random<string & tags.Format<"uuid">>();
  const unique_product_id_2 = typia.random<string & tags.Format<"uuid">>();
  // Name substring for targeted filtering
  const search_word = "SpecialItem";
  const orderItemsBuild = [
    {
      product_id: shared_product_id,
      item_name: search_word + " Alpha",
      quantity: 1,
      unit_price: 10000,
      total_price: 10000,
    },
    {
      product_id: shared_product_id,
      item_name: "Ordinary Beta",
      quantity: 2,
      unit_price: 5000,
      total_price: 10000,
    },
    {
      product_id: unique_product_id_1,
      item_name: "Gamma Thing",
      quantity: 1,
      unit_price: 8888,
      total_price: 8888,
    },
    {
      product_id: unique_product_id_2,
      item_name: "Delta Stuff",
      quantity: 3,
      unit_price: 100,
      total_price: 300,
    },
  ];
  const createdOrderItems: IAimallBackendOrderItem[] = [];
  for (const data of orderItemsBuild) {
    const orderItem =
      await api.functional.aimall_backend.customer.orders.orderItems.create(
        connection,
        {
          orderId: order.id,
          body: data satisfies IAimallBackendOrderItem.ICreate,
        },
      );
    typia.assert(orderItem);
    createdOrderItems.push(orderItem);
  }

  // 3. Search for order items by shared product_id; expect 2 results and correct filtering
  {
    const result =
      await api.functional.aimall_backend.customer.orders.orderItems.search(
        connection,
        {
          orderId: order.id,
          body: {
            order_id: order.id,
            product_id: shared_product_id,
          } satisfies IAimallBackendOrderItem.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals("product_id filtered orderItems count")(
      result.data.length,
    )(2);
    for (const item of result.data) {
      TestValidator.equals("item uses correct product_id")(item.product_id)(
        shared_product_id,
      );
    }
  }

  // 4. Search by product_id and item_name matching the substring
  {
    const result =
      await api.functional.aimall_backend.customer.orders.orderItems.search(
        connection,
        {
          orderId: order.id,
          body: {
            order_id: order.id,
            product_id: shared_product_id,
            item_name: search_word, // substring match for item_name
          } satisfies IAimallBackendOrderItem.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals("filtered on item_name substring")(result.data.length)(
      1,
    );
    if (result.data.length > 0) {
      const matched = result.data[0];
      TestValidator.equals("product_id")(matched.product_id)(shared_product_id);
      TestValidator.predicate("item_name contains filter")(
        matched.item_name.includes(search_word),
      );
    }
  }

  // 5. Search with non-existent product_id—expect empty result
  {
    const result =
      await api.functional.aimall_backend.customer.orders.orderItems.search(
        connection,
        {
          orderId: order.id,
          body: {
            order_id: order.id,
            product_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IAimallBackendOrderItem.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals("search for missing product_id yields empty")(
      result.data.length,
    )(0);
    TestValidator.equals("pagination reflects no data")(
      result.pagination.records,
    )(0);
  }

  // 6. Paginate by limit=2, expect 2 items and correct pagination metadata
  {
    const result =
      await api.functional.aimall_backend.customer.orders.orderItems.search(
        connection,
        {
          orderId: order.id,
          body: {
            order_id: order.id,
            limit: 2,
            page: 1,
          } satisfies IAimallBackendOrderItem.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals("only 2 items returned")(result.data.length)(2);
    TestValidator.equals("pagination limit")(result.pagination.limit)(2);
    TestValidator.equals("pagination current")(result.pagination.current)(1);
    TestValidator.predicate("pagination total records >= 4")(
      result.pagination.records >= 4,
    );
    TestValidator.predicate("pagination total pages >= 2")(
      result.pagination.pages >= 2,
    );
  }
}
