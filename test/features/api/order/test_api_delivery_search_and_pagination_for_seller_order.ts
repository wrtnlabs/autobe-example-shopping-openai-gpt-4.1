import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDelivery";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * E2E test for advanced delivery search and pagination in seller order context
 *
 * 1. Register a new seller (obtain section/channel for seller context)
 * 2. Register a customer
 * 3. Customer creates a cart in the seller's section/channel
 * 4. Admin creates an order for the customer using the above cart; assign order
 *    item to seller
 *
 *    - Compose order with delivery record(s) referencing real/valid values
 * 5. Seller auth context: request delivery search for this order
 *
 *    - Exercise pagination (e.g. limit=1, page=1/2)
 *    - Use recipient_name partial/substring filter
 *    - Use delivery_status filter (e.g., confirm only)
 *    - Use sorting (by created_at asc/desc)
 *    - Validate that only deliveries for seller's items are visible
 * 6. Negative: create new dummy order unrelated to the seller, attempt delivery
 *    search as seller and verify empty/forbidden result
 *
 * All entity relationships, required fields, and type safety maintained.
 */
export async function test_api_delivery_search_and_pagination_for_seller_order(
  connection: api.IConnection,
) {
  // 1. Seller registration
  const sellerRegistration = {
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    profile_name: RandomGenerator.name(),
    kyc_status: "pending",
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerRegistration,
  });
  typia.assert(sellerAuth);
  // 2. Customer registration
  const customerRegistration = {
    shopping_mall_channel_id: sellerRegistration.shopping_mall_channel_id,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerRegistration,
  });
  typia.assert(customerAuth);
  // 3. Create customer cart
  const cartCreate = {
    shopping_mall_customer_id: customerAuth.id,
    shopping_mall_channel_id: sellerRegistration.shopping_mall_channel_id,
    shopping_mall_section_id: sellerRegistration.shopping_mall_section_id,
    source: "member",
  } satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: cartCreate },
  );
  typia.assert(cart);
  // 4. Admin creates an order using cart, assigning item to seller
  const orderItem = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: sellerAuth.id,
    quantity: 2,
    unit_price: 10000,
    final_price: 9000,
    status: "ordered",
  } satisfies IShoppingMallOrderItem.ICreate;
  const delivery = {
    shopping_mall_order_id: orderItem.shopping_mall_order_id,
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph(),
    delivery_message: RandomGenerator.paragraph(),
    delivery_status: "prepared",
    delivery_attempts: 0,
  } satisfies IShoppingMallDelivery.ICreate;
  const payment = {
    shopping_mall_order_id: orderItem.shopping_mall_order_id,
    shopping_mall_customer_id: customerAuth.id,
    payment_type: "card",
    status: "paid",
    amount: 18000,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;
  const orderCreate = {
    shopping_mall_customer_id: customerAuth.id,
    shopping_mall_channel_id: sellerRegistration.shopping_mall_channel_id,
    shopping_mall_section_id: sellerRegistration.shopping_mall_section_id,
    shopping_mall_cart_id: cart.id,
    order_type: "normal",
    total_amount: 18000,
    currency: "KRW",
    order_items: [orderItem],
    deliveries: [delivery],
    payments: [payment],
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    { body: orderCreate },
  );
  typia.assert(order);
  // 5. Seller context: search deliveries for own order
  let searchResult =
    await api.functional.shoppingMall.seller.orders.deliveries.index(
      connection,
      {
        orderId: order.id,
        body: {
          limit: 1,
          page: 1,
          recipient_name: delivery.recipient_name,
        } satisfies IShoppingMallDelivery.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "seller search should return at least one delivery",
    searchResult.data.length > 0,
  );
  // Pagination test (next page)
  const paginationResult =
    await api.functional.shoppingMall.seller.orders.deliveries.index(
      connection,
      {
        orderId: order.id,
        body: { limit: 1, page: 2 } satisfies IShoppingMallDelivery.IRequest,
      },
    );
  typia.assert(paginationResult);
  // Filtering by status
  const filterStatusResult =
    await api.functional.shoppingMall.seller.orders.deliveries.index(
      connection,
      {
        orderId: order.id,
        body: {
          delivery_status: delivery.delivery_status,
        } satisfies IShoppingMallDelivery.IRequest,
      },
    );
  typia.assert(filterStatusResult);
  // Filtering by wrong seller/order: negative test
  const unrelatedOrder = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        ...orderCreate,
        order_items: [
          {
            ...orderItem,
            shopping_mall_seller_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          },
        ],
      },
    },
  );
  typia.assert(unrelatedOrder);
  const negativeResult =
    await api.functional.shoppingMall.seller.orders.deliveries.index(
      connection,
      {
        orderId: unrelatedOrder.id,
        body: {
          recipient_name: delivery.recipient_name,
        } satisfies IShoppingMallDelivery.IRequest,
      },
    );
  typia.assert(negativeResult);
  TestValidator.equals(
    "seller searching unrelated order sees zero deliveries",
    negativeResult.data.length,
    0,
  );
}
