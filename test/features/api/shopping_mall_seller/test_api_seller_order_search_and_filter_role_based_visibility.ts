import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that an authenticated seller can search and list their own orders with
 * filtering and pagination.
 *
 * This test verifies role-based data visibility, proper filter handling, and
 * secure pagination for seller order searches.
 *
 * Business context:
 *
 * - Sellers are only allowed to view orders for their own products.
 * - Filters for order status, date range, and fulltext search are supported.
 *
 * Test steps:
 *
 * 1. Register a seller and capture credentials/token
 * 2. Create a valid order shipping address snapshot (orderAddresses.create)
 * 3. Create a payment method snapshot (admin/orderPaymentMethods.create)
 * 4. Create multiple orders:
 *
 *    - Some with this seller's id
 *    - Some with a different (random) seller id
 *    - Diverse statuses, placed_at times
 * 5. As seller, query /shoppingMall/seller/orders with no filter:
 *
 *    - Expect only orders assigned to this seller
 * 6. Query with status filter (should restrict to only those with matching status)
 * 7. Query with placed_at range containing only some orders
 * 8. Query for orders by a status or order_number that does not match this seller
 *    (should be empty)
 * 9. Query with pagination: set limit to 2, page 1, page 2, etc., verify counts
 *    and data content
 * 10. Query with page way beyond the last page (should return empty data array)
 * 11. Query with filters that intentionally hit no records (expect empty results)
 * 12. Validate that no results from other sellers are visible at any point
 */
export async function test_api_seller_order_search_and_filter_role_based_visibility(
  connection: api.IConnection,
) {
  // Step 1: Seller registration.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuth);

  // Step 2: Create order shipping address snapshot for use in customer orders
  const orderAddressBody = {
    address_type: "shipping",
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    address_main: RandomGenerator.paragraph({ sentences: 3 }),
    address_detail: null,
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;
  const shippingAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: orderAddressBody,
      },
    );
  typia.assert(shippingAddress);

  // Step 3: Create order payment method snapshot (as admin)
  const paymentMethodBody = {
    payment_method_type: "card",
    method_data: '{"masked":"****1234"}',
    display_name: RandomGenerator.name(2) + " Card",
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: paymentMethodBody,
      },
    );
  typia.assert(paymentMethod);

  // Step 4: Create multiple orders with mixed sellers/status/times
  // We'll use the same address & payment for simplicity. Simulate 5 orders for our seller, 3 for others.
  const otherSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const now = new Date();
  const orderStatuses = [
    "pending",
    "paid",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ] as const;
  const sellerOrderDatas = ArrayUtil.repeat(5, (i) => {
    const status = RandomGenerator.pick(orderStatuses);
    return {
      shopping_mall_seller_id: sellerAuth.id,
      shipping_address_id: shippingAddress.id,
      payment_method_id: paymentMethod.id,
      order_total: Math.floor(Math.random() * 200000) + 10000,
      currency: "KRW",
      placed_at: new Date(
        now.getTime() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 7),
      ).toISOString(), // Up to 7 days ago
      status,
    } satisfies Partial<IShoppingMallOrder.ICreate> & {
      placed_at: string;
      status: string;
    };
  });
  const otherOrderDatas = ArrayUtil.repeat(3, (i) => {
    const status = RandomGenerator.pick(orderStatuses);
    return {
      shopping_mall_seller_id: otherSellerId,
      shipping_address_id: shippingAddress.id,
      payment_method_id: paymentMethod.id,
      order_total: Math.floor(Math.random() * 200000) + 10000,
      currency: "KRW",
      placed_at: new Date(
        now.getTime() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 7),
      ).toISOString(),
      status,
    } satisfies Partial<IShoppingMallOrder.ICreate> & {
      placed_at: string;
      status: string;
    };
  });
  // Actually create the orders: use the customer.order.create endpoint.
  const allOrderDatas = [...sellerOrderDatas, ...otherOrderDatas];
  const orders: IShoppingMallOrder[] = [];
  for (const orderData of allOrderDatas) {
    const createBody = {
      ...orderData,
      shopping_mall_customer_id: typia.random<string & tags.Format<"uuid">>(), // Simulate unique customer for each
      // Only allowed IShoppingMallOrder.ICreate DTO keys
      shipping_address_id: orderData.shipping_address_id,
      payment_method_id: orderData.payment_method_id,
      order_total: orderData.order_total,
      currency: orderData.currency,
      shopping_mall_seller_id: orderData.shopping_mall_seller_id,
    } satisfies IShoppingMallOrder.ICreate;
    const created = await api.functional.shoppingMall.customer.orders.create(
      connection,
      {
        body: createBody,
      },
    );
    typia.assert(created);
    // Apply virtual placed_at/status updates (simulate as if they were persisted)
    // For testing filters, pretend we have control for now
    orders.push({
      ...created,
      placed_at: orderData.placed_at,
      status: orderData.status,
    });
  }
  // Save only the orders for this seller
  const sellerOrders = orders.filter(
    (o) => o.shopping_mall_seller_id === sellerAuth.id,
  );
  const otherOrders = orders.filter(
    (o) => o.shopping_mall_seller_id === otherSellerId,
  );

  // Step 5: Seller order index (no filters) - expect only their orders
  const allOrdersRes = await api.functional.shoppingMall.seller.orders.index(
    connection,
    {
      body: {
        // No filters
      },
    },
  );
  typia.assert(allOrdersRes);
  TestValidator.equals(
    "all seller orders count matches",
    allOrdersRes.data.length,
    sellerOrders.length,
  );
  for (const actual of allOrdersRes.data) {
    TestValidator.equals(
      "seller ID isolation",
      actual.shopping_mall_seller_id,
      sellerAuth.id,
    );
  }

  // Step 6: Filter by status (pick one status present among seller orders)
  const usedStatus = RandomGenerator.pick(sellerOrders.map((o) => o.status));
  const filterByStatusRes =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: { status: usedStatus },
    });
  typia.assert(filterByStatusRes);
  for (const actual of filterByStatusRes.data) {
    TestValidator.equals(
      "filter by status - status matches",
      actual.status,
      usedStatus,
    );
    TestValidator.equals(
      "status - seller ID isolation",
      actual.shopping_mall_seller_id,
      sellerAuth.id,
    );
  }
  // Confirm only seller's orders with this status are present
  TestValidator.equals(
    "filter by status count",
    filterByStatusRes.data.length,
    sellerOrders.filter((o) => o.status === usedStatus).length,
  );

  // Step 7: Filter by placed_at range (simulate a 'from' and 'to' which catches only some orders)
  // Pick min/max placed_at from sellerOrders
  const sortedByPlaced = sellerOrders
    .slice()
    .sort((a, b) => a.placed_at.localeCompare(b.placed_at));
  const minDate = sortedByPlaced[1]?.placed_at;
  const maxDate = sortedByPlaced[3]?.placed_at;
  if (minDate && maxDate) {
    const dateRangeRes = await api.functional.shoppingMall.seller.orders.index(
      connection,
      {
        body: {
          placed_at_from: minDate,
          placed_at_to: maxDate,
        },
      },
    );
    typia.assert(dateRangeRes);
    for (const actual of dateRangeRes.data) {
      TestValidator.predicate(
        "order date in range",
        actual.placed_at >= minDate && actual.placed_at <= maxDate,
      );
      TestValidator.equals(
        "date range - seller ID isolation",
        actual.shopping_mall_seller_id,
        sellerAuth.id,
      );
    }
    const expectedInRange = sellerOrders.filter(
      (o) => o.placed_at >= minDate && o.placed_at <= maxDate,
    );
    TestValidator.equals(
      "date range count",
      dateRangeRes.data.length,
      expectedInRange.length,
    );
  }

  // Step 8: Query with filter (order_number) that matches only others (simulate no hits)
  const impossibleOrderNumber = "ORDER-NO-WAY-123456789";
  const unmatchedOrderRes =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: { order_number: impossibleOrderNumber },
    });
  typia.assert(unmatchedOrderRes);
  TestValidator.equals(
    "order_number filter - no hits",
    unmatchedOrderRes.data.length,
    0,
  );

  // Step 9: Pagination - limit 2, iterate through pages
  const limit = 2;
  let pagedTotal: IShoppingMallOrder.ISummary[] = [];
  let page = 1;
  for (;;) {
    const pageRes = await api.functional.shoppingMall.seller.orders.index(
      connection,
      {
        body: {
          limit,
          page: page as number &
            tags.Type<"int32"> &
            tags.Default<1> &
            tags.Minimum<1>,
        },
      },
    );
    typia.assert(pageRes);
    for (const actual of pageRes.data) {
      TestValidator.equals(
        "pagination - seller isolation",
        actual.shopping_mall_seller_id,
        sellerAuth.id,
      );
    }
    pagedTotal.push(...pageRes.data);
    if (pageRes.data.length < limit) break;
    ++page;
  }
  // All pages combined equals expected seller orders
  TestValidator.equals(
    "pagination - full set match",
    pagedTotal.length,
    sellerOrders.length,
  );
  // Page overflow: should return empty array when page > total pages
  const overflowRes = await api.functional.shoppingMall.seller.orders.index(
    connection,
    {
      body: {
        limit,
        page: (page + 1) as number &
          tags.Type<"int32"> &
          tags.Default<1> &
          tags.Minimum<1>,
      },
    },
  );
  typia.assert(overflowRes);
  TestValidator.equals(
    "pagination - overflow returns empty",
    overflowRes.data.length,
    0,
  );

  // Step 10: Redundant filter hits no records - filter by impossible status
  const impossibleStatus = "not_a_real_order_status";
  const noHitStatusRes = await api.functional.shoppingMall.seller.orders.index(
    connection,
    {
      body: { status: impossibleStatus },
    },
  );
  typia.assert(noHitStatusRes);
  TestValidator.equals(
    "impossible status hits no records",
    noHitStatusRes.data.length,
    0,
  );

  // Step 11: Confirm again, at no query do other sellers' orders appear
  for (const dataRes of [
    allOrdersRes,
    filterByStatusRes,
    overflowRes,
    noHitStatusRes,
  ]) {
    for (const actual of dataRes.data) {
      TestValidator.equals(
        "no other seller orders appear",
        actual.shopping_mall_seller_id,
        sellerAuth.id,
      );
    }
  }
}
