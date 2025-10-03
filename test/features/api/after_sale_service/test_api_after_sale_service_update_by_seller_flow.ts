import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate that a seller can update after-sales service cases related to their
 * orders, such as adding resolution messages, status changes (e.g. to
 * processing, approved, denied), or providing evidence.
 *
 * Steps:
 *
 * 1. Register a seller.
 * 2. Create a cart for a (test) customer (assume backend allows arbitrary UUID
 *    link for the scenario).
 * 3. Create an order (admin) referencing the cart, seller, and customer (order
 *    includes at least one item for this seller).
 * 4. Create delivery record for the order.
 * 5. As the seller, create an after-sales service case for the order (choose any
 *    case_type, e.g., "return", "exchange").
 * 6. Update the after-sales service as the seller: change status, add resolution
 *    message, possibly evidence_snapshot or reason.
 * 7. Assert that the update succeeds, the new status/message/evidence/fields are
 *    present, and that audit/evidence trail is maintained.
 * 8. Negative test: try to update with disallowed status transition (e.g., approve
 *    from "requested" directly if not permitted) and expect error.
 * 9. Negative test: have a different (non-associated) seller attempt the update,
 *    expect permission error.
 */
export async function test_api_after_sale_service_update_by_seller_flow(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "test1234",
    name: RandomGenerator.name(),
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
    profile_name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuth);
  TestValidator.equals(
    "seller email matches",
    sellerAuth.seller?.profile_name,
    sellerJoinBody.profile_name,
  );

  // 2. Create customer cart (simulate with random UUIDs for required fields)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const channelId = sellerJoinBody.shopping_mall_channel_id;
  const sectionId = sellerJoinBody.shopping_mall_section_id;
  const cartBody = {
    shopping_mall_customer_id: customerId,
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    source: "member",
  } satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: cartBody },
  );
  typia.assert(cart);
  TestValidator.equals(
    "cart channel id",
    cart.shopping_mall_channel_id,
    channelId,
  );

  // 3. Create order as admin
  const orderItemBody = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // order id is set by order creation
    shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: sellerAuth.id,
    quantity: 1,
    unit_price: 1000,
    final_price: 1000,
    status: "ordered",
  } satisfies IShoppingMallOrderItem.ICreate;
  const deliveryCreateBody = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // will set this in api call
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph(),
    delivery_status: "prepared",
    delivery_attempts: 0,
  } satisfies IShoppingMallDelivery.ICreate;
  const paymentBody = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // will set in api
    shopping_mall_customer_id: customerId,
    payment_type: "card",
    status: "pending",
    amount: 1000,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;
  const orderCreateBody = {
    shopping_mall_customer_id: customerId,
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    shopping_mall_cart_id: cart.id,
    order_type: "normal",
    total_amount: 1000,
    currency: "KRW",
    order_items: [
      {
        ...orderItemBody,
        // fix order id after creation
        shopping_mall_order_id: "",
      },
    ],
    deliveries: [
      {
        ...deliveryCreateBody,
        shopping_mall_order_id: "",
      },
    ],
    payments: [
      {
        ...paymentBody,
        shopping_mall_order_id: "",
      },
    ],
  } satisfies IShoppingMallOrder.ICreate;
  let order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    { body: orderCreateBody },
  );
  typia.assert(order);
  // Fix order references
  orderCreateBody.order_items[0].shopping_mall_order_id = order.id;
  orderCreateBody.deliveries[0].shopping_mall_order_id = order.id;
  orderCreateBody.payments[0].shopping_mall_order_id = order.id;

  // 4. Create delivery
  const delivery =
    await api.functional.shoppingMall.customer.orders.deliveries.create(
      connection,
      {
        orderId: order.id,
        body: orderCreateBody.deliveries[0],
      },
    );
  typia.assert(delivery);
  TestValidator.equals(
    "delivery order id",
    delivery.shopping_mall_order_id,
    order.id,
  );

  // 5. Create after-sales service as seller
  const afterSaleCreateBody = {
    case_type: "return",
    shopping_mall_delivery_id: delivery.id,
    reason: "product damaged",
    evidence_snapshot: RandomGenerator.content({ paragraphs: 1 }),
    resolution_message: null,
  } satisfies IShoppingMallAfterSaleService.ICreate;
  const afterSaleService =
    await api.functional.shoppingMall.seller.orders.afterSaleServices.create(
      connection,
      { orderId: order.id, body: afterSaleCreateBody },
    );
  typia.assert(afterSaleService);

  // 6. Update after-sales service as seller: add resolution message & change status
  const updateBody: IShoppingMallAfterSaleService.IUpdate = {
    resolution_message: "Approved, processing refund.",
    status: "processing",
  };
  const updated =
    await api.functional.shoppingMall.seller.orders.afterSaleServices.update(
      connection,
      {
        orderId: order.id,
        afterSaleServiceId: afterSaleService.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "after-sale updated status",
    updated.status,
    "processing",
  );
  TestValidator.equals(
    "after-sale updated resolution_message",
    updated.resolution_message,
    "Approved, processing refund.",
  );

  // 7. Negative: Try to set disallowed status transition
  await TestValidator.error(
    "disallowed status transition should fail",
    async () => {
      await api.functional.shoppingMall.seller.orders.afterSaleServices.update(
        connection,
        {
          orderId: order.id,
          afterSaleServiceId: afterSaleService.id,
          body: { status: "approved" },
        },
      );
    },
  );

  // 8. Negative: Register a different seller and attempt unauthorized update
  const otherSellerEmail = typia.random<string & tags.Format<"email">>();
  const otherSellerJoinBody = {
    email: otherSellerEmail,
    password: "otherpass",
    name: RandomGenerator.name(),
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    profile_name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.IJoin;
  await api.functional.auth.seller.join(connection, {
    body: otherSellerJoinBody,
  }); // login switches auth token
  await TestValidator.error(
    "unauthorized seller cannot update other's after-sale service",
    async () => {
      await api.functional.shoppingMall.seller.orders.afterSaleServices.update(
        connection,
        {
          orderId: order.id,
          afterSaleServiceId: afterSaleService.id,
          body: { resolution_message: "I should not be able to do this" },
        },
      );
    },
  );
}
