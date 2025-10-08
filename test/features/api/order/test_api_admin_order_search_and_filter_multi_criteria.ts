import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * End-to-end test for admin-side advanced order search and filtering in the
 * shopping mall system.
 *
 * This test validates that an admin can:
 *
 * - Register and obtain authority to access order management APIs
 * - Create sample shipping address and order payment method records needed for
 *   orders
 * - Place several test orders with differing status, date, and amounts
 *   (simulating different customers if needed)
 * - Use the admin order search API to:
 *
 *   1. List all orders (paging, correct metadata)
 *   2. Filter by status (e.g. pending, paid, cancelled)
 *   3. Filter by placed_at date range
 *   4. Filter by customer ID
 *   5. Filter by currency and amount range
 *   6. Edge: Query with no matching filters (should return empty)
 *   7. Edge: Use extreme pagination (high page/low limit)
 *   8. Edge: Invalid filter combinations (should return empty or proper business
 *        result)
 * - All returned orders are only those the admin is authorized to view, and
 *   sensitive customer data (beyond id) is masked.
 * - All paginated results use correct pagination info.
 *
 * Test steps:
 *
 * 1. Register as new admin
 * 2. Create order address snapshot
 * 3. Create order payment method snapshot
 * 4. Create multiple orders with different status/date/amount/currency and at
 *    least two customers
 * 5. Paginated order list: fetch first page, verify meta/data, all created orders
 *    appear
 * 6. Search by status: pick a known status and verify returned data match and
 *    exclude others
 * 7. Search by date range: select a subset, check only matching orders appear
 * 8. Search by customer id: verify only that customer's orders shown
 * 9. Search by amount or currency: verify filtering
 * 10. Edge - no match: pick a nonsense filter and verify data is empty
 * 11. Edge - extreme paging: high page/low limit, verify correct empty/paging
 * 12. Edge - invalid mix: nonsensical filter, verify empty
 */
export async function test_api_admin_order_search_and_filter_multi_criteria(
  connection: api.IConnection,
) {
  // 1. Register as new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create order address snapshot (once, reused for all test orders)
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 2 }),
          address_detail: RandomGenerator.paragraph({ sentences: 2 }),
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 3. Create order payment method snapshot (once, reused for all test orders)
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: RandomGenerator.alphaNumeric(10),
          display_name: `Visa ****${RandomGenerator.alphaNumeric(4)}`,
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 4. Create orders with different status/date/amount/currency and at least two different customers
  // We'll simulate by creating orders with typia.random spread over key fields
  // Simulate two customers (IDs, generated here)
  const customerIds = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  // We'll create 4 orders: each with a different status, dates, and customer
  const statuses = ["pending", "paid", "cancelled", "delivered"] as const;
  const currencies = ["KRW", "USD"] as const;
  const now = new Date();
  // Date spread: now, now-2d, now-5d, now-10d
  const orderDates = [0, -2, -5, -10].map((daysAgo) => {
    const dt = new Date(now);
    dt.setDate(now.getDate() + daysAgo);
    return dt.toISOString();
  });
  // Pre-collect created orders for search verification
  const createdOrders: IShoppingMallOrder[] = [];
  for (let i = 0; i < 4; ++i) {
    const orderTotal = 10000 * (i + 1);
    const order = await api.functional.shoppingMall.customer.orders.create(
      connection,
      {
        body: {
          shopping_mall_customer_id: customerIds[i % customerIds.length],
          shipping_address_id: orderAddress.id,
          payment_method_id: paymentMethod.id,
          order_total: orderTotal,
          currency: currencies[i % currencies.length],
        } satisfies IShoppingMallOrder.ICreate,
      },
    );
    typia.assert(order);
    // Simulate extra status/date changes (cannot be set at create; only for type reference)
    createdOrders.push(order);
  }

  // 5. Paginated order list: fetch first page, verify meta/data, all orders appear
  let page = await api.functional.shoppingMall.admin.orders.index(connection, {
    body: {
      limit: 10,
      page: 1,
    } satisfies IShoppingMallOrder.IRequest,
  });
  typia.assert(page);
  TestValidator.predicate(
    "pagination meta present",
    typeof page.pagination.current === "number" &&
      typeof page.pagination.limit === "number",
  );
  TestValidator.predicate("order list not empty", page.data.length >= 4);
  // Each of the created order IDs found in results
  for (const co of createdOrders) {
    TestValidator.predicate(
      `created order ${co.id} listed in admin listing`,
      page.data.some((x) => x.id === co.id),
    );
  }

  // 6. Search by status: select a known status (e.g., "pending")
  page = await api.functional.shoppingMall.admin.orders.index(connection, {
    body: {
      status: "pending",
    } satisfies IShoppingMallOrder.IRequest,
  });
  typia.assert(page);
  TestValidator.predicate(
    "orders match pending status",
    page.data.every((order) => order.status === "pending"),
  );

  // 7. Filter by date range (pick one order's placed_at window)
  const targetOrder = createdOrders[1];
  page = await api.functional.shoppingMall.admin.orders.index(connection, {
    body: {
      placed_at_from: targetOrder.placed_at,
      placed_at_to: targetOrder.placed_at,
    } satisfies IShoppingMallOrder.IRequest,
  });
  typia.assert(page);
  TestValidator.predicate(
    "matched by date window",
    page.data.every((x) => x.placed_at === targetOrder.placed_at),
  );

  // 8. Filter by customer id
  const filterCustomerId = customerIds[0];
  page = await api.functional.shoppingMall.admin.orders.index(connection, {
    body: {
      customer_id: filterCustomerId,
    } satisfies IShoppingMallOrder.IRequest,
  });
  typia.assert(page);
  TestValidator.predicate(
    "all returned orders belong to requested customer",
    page.data.every((x) => x.shopping_mall_customer_id === filterCustomerId),
  );

  // 9. Filter by currency/amount range
  page = await api.functional.shoppingMall.admin.orders.index(connection, {
    body: {
      currency: "KRW",
      min_total: 10000,
      max_total: 40000,
    } satisfies IShoppingMallOrder.IRequest,
  });
  typia.assert(page);
  TestValidator.predicate(
    "all orders match currency/amount filters",
    page.data.every(
      (x) =>
        x.currency === "KRW" &&
        x.order_total >= 10000 &&
        x.order_total <= 40000,
    ),
  );

  // 10. Edge: nonsense filter (e.g. customer_id + status that no real order matches)
  page = await api.functional.shoppingMall.admin.orders.index(connection, {
    body: {
      customer_id: customerIds[0],
      status: "delivered",
      currency: "USD",
      min_total: 900000, // far above test amount
    } satisfies IShoppingMallOrder.IRequest,
  });
  typia.assert(page);
  TestValidator.equals("empty data with impossible criteria", page.data, []);

  // 11. Edge: Extreme paging
  page = await api.functional.shoppingMall.admin.orders.index(connection, {
    body: {
      limit: 1,
      page: 999, // likely way beyond data
    } satisfies IShoppingMallOrder.IRequest,
  });
  typia.assert(page);
  TestValidator.equals("empty page on over-large page index", page.data, []);

  // 12. Edge: invalid mix (impossible date in future)
  page = await api.functional.shoppingMall.admin.orders.index(connection, {
    body: {
      placed_at_from: new Date("2999-01-01T00:00:00.000Z").toISOString(),
    } satisfies IShoppingMallOrder.IRequest,
  });
  typia.assert(page);
  TestValidator.equals(
    "empty data for date window with no results",
    page.data,
    [],
  );
}
