import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate after-sale service detail access for order as customer.
 *
 * 1. Register a unique customer.
 * 2. Customer constructs a cart (with valid random linkage ids).
 * 3. Admin creates an order for this customer/cart, including at least one order
 *    item, payment, and delivery with all UUID linkages per schema.
 * 4. Customer creates a delivery for that order.
 * 5. Customer submits an after-sale service request for that order (optionally
 *    linked to the created delivery).
 * 6. Retrieve the after-sale service record by id and validate that all core
 *    fields match, and audit metadata is present.
 * 7. Try to get the same after-sale record as another customer (should error).
 * 8. TODO: Soft-deletion scenario if API supports it (skipped if not possible).
 */
export async function test_api_order_after_sale_service_detail_customer_access(
  connection: api.IConnection,
) {
  // 1. Register first customer
  const customerInput = {
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerInput,
    });

  // 2. Customer creates cart
  const cartInput = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: customer.shopping_mall_channel_id,
    shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
    source: "member",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartInput,
    });

  // 3. Admin creates an order for this customer/cart (with one item/payment/delivery)
  const orderItemInput = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1,
    unit_price: 5000,
    final_price: 5000,
    status: "ordered",
  } satisfies IShoppingMallOrderItem.ICreate;
  const paymentInput = {
    shopping_mall_order_id: orderItemInput.shopping_mall_order_id,
    shopping_mall_customer_id: customer.id,
    payment_type: "card",
    status: "paid",
    amount: 5000,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;
  const deliveryInput = {
    shopping_mall_order_id: orderItemInput.shopping_mall_order_id,
    recipient_name: customer.name,
    recipient_phone: customer.phone || RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph(),
    delivery_status: "prepared",
    delivery_attempts: 0,
  } satisfies IShoppingMallDelivery.ICreate;
  const orderInput = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: customer.shopping_mall_channel_id,
    shopping_mall_section_id: cart.shopping_mall_section_id,
    shopping_mall_cart_id: cart.id,
    order_type: "normal",
    total_amount: 5000,
    currency: "KRW",
    order_items: [orderItemInput],
    deliveries: [deliveryInput],
    payments: [paymentInput],
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.create(connection, {
      body: orderInput,
    });

  // 4. Customer creates delivery via customer orders API (simulate address update)
  const customerDeliveryInput = {
    shopping_mall_order_id: order.id,
    recipient_name: customer.name,
    recipient_phone: customer.phone || RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph(),
    delivery_status: "prepared",
    delivery_attempts: 1,
  } satisfies IShoppingMallDelivery.ICreate;
  const delivery: IShoppingMallDelivery =
    await api.functional.shoppingMall.customer.orders.deliveries.create(
      connection,
      { orderId: order.id, body: customerDeliveryInput },
    );

  // 5. Customer creates after-sale service request for the order (linked to created delivery)
  const afterSaleInput = {
    case_type: RandomGenerator.pick([
      "return",
      "exchange",
      "refund",
      "repair",
    ] as const),
    shopping_mall_delivery_id: delivery.id,
    reason: RandomGenerator.paragraph(),
    evidence_snapshot: RandomGenerator.content({ paragraphs: 2 }),
    resolution_message: null,
  } satisfies IShoppingMallAfterSaleService.ICreate;
  const afterSale: IShoppingMallAfterSaleService =
    await api.functional.shoppingMall.customer.orders.afterSaleServices.create(
      connection,
      { orderId: order.id, body: afterSaleInput },
    );
  typia.assert(afterSale);

  // 6. Retrieve after-sale service record and validate
  const detail: IShoppingMallAfterSaleService =
    await api.functional.shoppingMall.customer.orders.afterSaleServices.at(
      connection,
      { orderId: order.id, afterSaleServiceId: afterSale.id },
    );
  typia.assert(detail);
  TestValidator.equals("after-sale id matches", detail.id, afterSale.id);
  TestValidator.equals(
    "order id matches",
    detail.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "case_type matches",
    detail.case_type,
    afterSaleInput.case_type,
  );
  TestValidator.equals(
    "delivery id matches",
    detail.shopping_mall_delivery_id,
    delivery.id,
  );
  TestValidator.equals("reason matches", detail.reason, afterSaleInput.reason);
  TestValidator.equals(
    "evidence_snapshot matches",
    detail.evidence_snapshot,
    afterSaleInput.evidence_snapshot,
  );
  TestValidator.equals(
    "resolution_message matches",
    detail.resolution_message,
    null,
  );
  TestValidator.predicate(
    "created_at is valid",
    typeof detail.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is valid",
    typeof detail.updated_at === "string",
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    detail.deleted_at,
    undefined,
  );

  // 7. Unauthorized customer cannot access after-sale detail
  const otherCustomerInput = {
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const otherCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: otherCustomerInput,
    });
  await TestValidator.error(
    "other customer cannot access after-sale detail",
    async () => {
      await api.functional.shoppingMall.customer.orders.afterSaleServices.at(
        connection,
        { orderId: order.id, afterSaleServiceId: afterSale.id },
      );
    },
  );

  // 8. Soft-deleted after-sale (skipped, as delete API isn't exposed in schema)
}
