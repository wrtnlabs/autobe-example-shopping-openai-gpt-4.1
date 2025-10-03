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
 * E2E: Customer creates after-sale service for eligible order This test
 * validates that a newly registered customer can successfully submit an
 * after-sales service request for a valid and eligible order. The procedure
 * rigorously checks for correct business logic regarding eligibility, required
 * relationships, and audit integrity.
 *
 * Steps:
 *
 * 1. Register a new customer (using unique email, password, etc.)
 * 2. Create a shopping cart for that customer (assign to a valid channel and
 *    section)
 * 3. Have the admin create a valid order for this customer, with at least one
 *    order item, valid delivery, and payment.
 * 4. As the customer, create a delivery record referencing the order (required for
 *    after-sales that reference shipments).
 * 5. As the customer, file a valid after-sales service request (e.g., return or
 *    exchange) for the order, referencing delivery if appropriate.
 * 6. Assert that the created after-sales service links correctly to the order (and
 *    delivery), contains the correct case_type, evidence, and (if supplied)
 *    reason.
 * 7. Negative test: Attempt to submit an after-sales request for an ineligible
 *    order and check that an error is returned as expected (business rule
 *    violation).
 */
export async function test_api_after_sale_service_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration
  const channelId: string = typia.random<string & tags.Format<"uuid">>();
  const email: string = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 2. Create cart for this customer
  const sectionId: string = typia.random<string & tags.Format<"uuid">>();
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // 3. Create order from admin (simulate admin flow, system/backoffice call)
  const productId: string = typia.random<string & tags.Format<"uuid">>();
  const sellerId: string = typia.random<string & tags.Format<"uuid">>();
  const orderItem = {
    shopping_mall_order_id: "temp", // will be overwritten by API, but required for DTO
    shopping_mall_product_id: productId,
    shopping_mall_product_variant_id: null,
    shopping_mall_seller_id: sellerId,
    quantity: 1,
    unit_price: 10000,
    final_price: 9500,
    discount_snapshot: null,
    status: "ordered",
  } satisfies IShoppingMallOrderItem.ICreate;

  const delivery = {
    shopping_mall_order_id: "temp", // will be overwritten
    shopping_mall_shipment_id: undefined,
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: JSON.stringify({ addr: RandomGenerator.paragraph() }),
    delivery_message: RandomGenerator.paragraph(),
    delivery_status: "prepared",
    delivery_attempts: 0,
  } satisfies IShoppingMallDelivery.ICreate;

  const payment = {
    shopping_mall_order_id: "temp", // will be overwritten
    shopping_mall_customer_id: customer.id,
    payment_type: "card",
    external_payment_ref: null,
    status: "paid",
    amount: 9500,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;

  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        shopping_mall_cart_id: cart.id,
        external_order_ref: null,
        order_type: "normal",
        total_amount: 10000,
        currency: "KRW",
        order_items: [orderItem],
        deliveries: [delivery],
        payments: [payment],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 4. Create delivery for the order (as customer)
  const custDelivery =
    await api.functional.shoppingMall.customer.orders.deliveries.create(
      connection,
      {
        orderId: order.id,
        body: {
          shopping_mall_order_id: order.id,
          shopping_mall_shipment_id: undefined,
          recipient_name: RandomGenerator.name(),
          recipient_phone: RandomGenerator.mobile(),
          address_snapshot: JSON.stringify({
            address: RandomGenerator.paragraph(),
          }),
          delivery_message: RandomGenerator.paragraph(),
          delivery_status: "prepared",
          delivery_attempts: 1,
        } satisfies IShoppingMallDelivery.ICreate,
      },
    );
  typia.assert(custDelivery);
  TestValidator.equals(
    "delivery.order_id",
    custDelivery.shopping_mall_order_id,
    order.id,
  );

  // 5. Customer files after-sales service request (eligible case)
  const afterSaleType = RandomGenerator.pick([
    "return",
    "exchange",
    "repair",
  ] as const);
  const afterSaleReason = RandomGenerator.paragraph();
  const afterSaleEvidence = JSON.stringify({ info: RandomGenerator.content() });

  const afterSale =
    await api.functional.shoppingMall.customer.orders.afterSaleServices.create(
      connection,
      {
        orderId: order.id,
        body: {
          case_type: afterSaleType,
          shopping_mall_delivery_id: custDelivery.id,
          reason: afterSaleReason,
          evidence_snapshot: afterSaleEvidence,
          resolution_message: null,
        } satisfies IShoppingMallAfterSaleService.ICreate,
      },
    );
  typia.assert(afterSale);
  TestValidator.equals(
    "afterSales.order_id",
    afterSale.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "afterSales.delivery_id",
    afterSale.shopping_mall_delivery_id,
    custDelivery.id,
  );
  TestValidator.equals(
    "afterSales.case_type",
    afterSale.case_type,
    afterSaleType,
  );
  TestValidator.equals("afterSales.reason", afterSale.reason, afterSaleReason);
  TestValidator.equals(
    "afterSales.evidence",
    afterSale.evidence_snapshot,
    afterSaleEvidence,
  );
  TestValidator.equals("afterSales.status", typeof afterSale.status, "string");

  // 6. Negative: Try after-sales on non-existent or ineligible order
  const fakeOrderId: string = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should reject after-sales for non-existent order",
    async () => {
      await api.functional.shoppingMall.customer.orders.afterSaleServices.create(
        connection,
        {
          orderId: fakeOrderId,
          body: {
            case_type: "return",
            shopping_mall_delivery_id: null,
            reason: "Attempt on fake order",
            evidence_snapshot: null,
            resolution_message: null,
          } satisfies IShoppingMallAfterSaleService.ICreate,
        },
      );
    },
  );
}
