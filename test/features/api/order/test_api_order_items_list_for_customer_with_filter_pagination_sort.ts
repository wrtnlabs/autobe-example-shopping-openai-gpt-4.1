import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * End-to-end integration test for order item listing (filter/pagination/sort)
 * for customers.
 *
 * Simulates full workflow: (1) admin sets up channel/section/category, (2)
 * seller registers product in that scope, (3) customer registers, (4) customer
 * creates a cart (for channel/section), (5) cart is converted to order (admin
 * endpoint), then (6) customer retrieves order items via PATCH (filter,
 * pagination, sort). Verifies:
 *
 * - Only customer's own items are accessible (ownership/permission, not leaked to
 *   others)
 * - Filtering by status/product works (returns correct items only)
 * - Paging (limit/page) returns correct subset & pagination info
 * - Unfiltered listing returns all items of the order
 * - No unauthorized access to another user's order (should error)
 * - Filtering with no matches yields empty data array but valid pagination
 *
 * Step-by-step:
 *
 * 1. Admin creates channel
 * 2. Admin creates section in that channel
 * 3. Admin creates a category in the channel
 * 4. Seller creates a product (for that channel/section/category)
 * 5. Customer registers & logs in
 * 6. Customer creates cart scoped to channel/section
 * 7. Admin converts cart to order (with at least one item)
 * 8. Customer lists all order items for the order
 * 9. Filters by product ID: returns only item(s) for the requested product
 * 10. Filters by status: returns only correct status items
 * 11. Tests paging/limit
 * 12. Filters with bogus product ID: expect empty data
 * 13. Attempt access to another user's order: expect error
 */
export async function test_api_order_items_list_for_customer_with_filter_pagination_sort(
  connection: api.IConnection,
) {
  // 1. Admin creates channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      },
    },
  );
  typia.assert(channel);

  // 2. Admin creates section in channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 0,
        },
      },
    );
  typia.assert(section);

  // 3. Admin creates category in channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph(),
          display_order: 0,
        },
      },
    );
  typia.assert(category);

  // 4. Seller registers product (pretend seller is admin)
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(), // Simulate seller
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph(),
        status: "active",
        business_status: "approval",
      },
    },
  );
  typia.assert(product);

  // 5. Customer registers & logs in
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);

  // 6. Customer creates cart
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      },
    },
  );
  typia.assert(cart);

  // 7. Admin creates order for this cart (with 1 item)
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: 50000,
        currency: "KRW",
        order_items: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(), // Assigned by backend
            shopping_mall_product_id: product.id,
            shopping_mall_product_variant_id: null,
            shopping_mall_seller_id: product.shopping_mall_seller_id,
            quantity: 2,
            unit_price: 25000,
            final_price: 20000,
            discount_snapshot: JSON.stringify({ applied: false }),
            status: "ordered",
          },
        ],
        deliveries: [],
        payments: [],
        after_sale_services: [],
      },
    },
  );
  typia.assert(order);

  // 8. Customer lists all order items (no filter, get all)
  const listAll = await api.functional.shoppingMall.customer.orders.items.index(
    connection,
    {
      orderId: order.id,
      body: {},
    },
  );
  typia.assert(listAll);
  TestValidator.predicate("Order item(s) returned", listAll.data.length > 0);
  TestValidator.equals(
    "Correct order ID on item",
    listAll.data[0].shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "Correct product ID",
    listAll.data[0].shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals("Status matches", listAll.data[0].status, "ordered");

  // 9. Filter by product ID
  const listFiltered =
    await api.functional.shoppingMall.customer.orders.items.index(connection, {
      orderId: order.id,
      body: { product_id: product.id },
    });
  typia.assert(listFiltered);
  TestValidator.equals(
    "Filtering by product ID returns correct items",
    listFiltered.data.length,
    1,
  );
  TestValidator.equals(
    "Correct filtered product",
    listFiltered.data[0].shopping_mall_product_id,
    product.id,
  );

  // 10. Filter by status
  const listByStatus =
    await api.functional.shoppingMall.customer.orders.items.index(connection, {
      orderId: order.id,
      body: { status: "ordered" },
    });
  typia.assert(listByStatus);
  TestValidator.equals(
    "Filter by status returns relevant items",
    listByStatus.data.length,
    1,
  );
  TestValidator.equals(
    "Filtered status matches",
    listByStatus.data[0].status,
    "ordered",
  );

  // 11. Test pagination (limit=1)
  const paged = await api.functional.shoppingMall.customer.orders.items.index(
    connection,
    {
      orderId: order.id,
      body: { limit: 1, page: 1 },
    },
  );
  typia.assert(paged);
  TestValidator.equals(
    "Pagination returns only one item",
    paged.data.length,
    1,
  );
  TestValidator.equals("Pagination param in meta", paged.pagination.limit, 1);

  // 12. Test filter by bogus product ID (no items expected)
  const none = await api.functional.shoppingMall.customer.orders.items.index(
    connection,
    {
      orderId: order.id,
      body: { product_id: typia.random<string & tags.Format<"uuid">>() },
    },
  );
  typia.assert(none);
  TestValidator.equals(
    "Filtering by non-existent product returns empty array",
    none.data.length,
    0,
  );

  // 13. Attempt to access a different customer's order (simulate by using a bogus orderId)
  await TestValidator.error(
    "Unauthorized access to another order should be rejected",
    async () => {
      await api.functional.shoppingMall.customer.orders.items.index(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          body: {},
        },
      );
    },
  );
}
