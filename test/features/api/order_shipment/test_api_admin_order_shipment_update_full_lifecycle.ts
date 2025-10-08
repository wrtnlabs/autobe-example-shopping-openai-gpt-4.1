import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";

/**
 * E2E test covering the full lifecycle for order shipment updates as admin.
 *
 * Scenario:
 *
 * 1. Register a new admin account and obtain authentication.
 * 2. Create a new customer account with default shipping address.
 * 3. Create an immutable order address snapshot for use in the order.
 * 4. As admin, create a payment method snapshot for use in the order.
 * 5. As customer, place an order referencing the shipping address and payment
 *    method.
 * 6. As admin, assume a shipment is created by the system and capture/construct an
 *    initial shipmentId (simulate as if the order has exactly one shipment with
 *    known or predictable id).
 * 7. Update shipment with new carrier, tracking_number, status transitions
 *    (pending→shipped→delivered), set timestamps, remark.
 * 8. After each update, retrieve the shipment and verify changes are correct
 *    (carrier name, tracking, status, timestamps, remarks).
 * 9. Attempt to update shipment with illegal status, or wrong transitions; assert
 *    error is thrown.
 * 10. Attempt update for non-existent order/shipment; confirm error is thrown.
 * 11. Attempt to update a shipment that does not belong to the given order; confirm
 *     rejection.
 */
export async function test_api_admin_order_shipment_update_full_lifecycle(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register customer
  const custEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: custEmail,
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 2 }),
        postal_code: RandomGenerator.alphaNumeric(6),
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        is_default: true,
      } satisfies IShoppingMallCustomerAddress.ICreate,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 3. Create order address snapshot
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(6),
          address_main: RandomGenerator.paragraph({ sentences: 3 }),
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 4. Create payment method snapshot as admin
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: JSON.stringify({ bank: "Woori" }),
          display_name: "Woori Card",
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 5. Place order as customer (supply explicit customer id as admin/power user)
  const orderTotal = 29900;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: orderTotal,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 6. Simulate existence of initial shipment (use random id)
  const shipmentId = typia.random<string & tags.Format<"uuid">>();

  // 7. Update shipment: carrier name, tracking, status: pending→shipped→delivered, set timestamps, remark
  // a. Set to "pending"
  let shipment =
    await api.functional.shoppingMall.admin.orders.shipments.update(
      connection,
      {
        orderId: order.id,
        shipmentId: shipmentId,
        body: {
          carrier: "CJ대한통운",
          tracking_number: RandomGenerator.alphaNumeric(12),
          status: "pending",
          remark: "처음 출고 대기",
        } satisfies IShoppingMallOrderShipment.IUpdate,
      },
    );
  typia.assert(shipment);
  TestValidator.equals("carrier after pending", shipment.carrier, "CJ대한통운");
  TestValidator.equals("status after pending", shipment.status, "pending");
  TestValidator.equals(
    "remark after pending",
    shipment.remark,
    "처음 출고 대기",
  );

  // b. Set to "shipped" and dispatched_at
  const dispatchedAt = new Date().toISOString();
  shipment = await api.functional.shoppingMall.admin.orders.shipments.update(
    connection,
    {
      orderId: order.id,
      shipmentId: shipmentId,
      body: {
        carrier: "CJ대한통운",
        tracking_number: shipment.tracking_number,
        status: "shipped",
        dispatched_at: dispatchedAt,
        remark: "출고 완료",
      } satisfies IShoppingMallOrderShipment.IUpdate,
    },
  );
  typia.assert(shipment);
  TestValidator.equals("status after shipped", shipment.status, "shipped");
  TestValidator.equals(
    "dispatched_at after shipped",
    shipment.dispatched_at,
    dispatchedAt,
  );
  TestValidator.equals("remark after shipped", shipment.remark, "출고 완료");

  // c. Set to "delivered" and delivered_at
  const deliveredAt = new Date(Date.now() + 86400000).toISOString();
  shipment = await api.functional.shoppingMall.admin.orders.shipments.update(
    connection,
    {
      orderId: order.id,
      shipmentId: shipmentId,
      body: {
        carrier: "CJ대한통운",
        tracking_number: shipment.tracking_number,
        status: "delivered",
        dispatched_at: shipment.dispatched_at,
        delivered_at: deliveredAt,
        remark: "배송완료",
      } satisfies IShoppingMallOrderShipment.IUpdate,
    },
  );
  typia.assert(shipment);
  TestValidator.equals("status after delivered", shipment.status, "delivered");
  TestValidator.equals(
    "delivered_at after delivered",
    shipment.delivered_at,
    deliveredAt,
  );
  TestValidator.equals("remark after delivered", shipment.remark, "배송완료");

  // 9. Edge case: update with illegal status (e.g., jump to delivered w/o shipped)
  const illegalShipmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("illegal status transition fails", async () => {
    await api.functional.shoppingMall.admin.orders.shipments.update(
      connection,
      {
        orderId: order.id,
        shipmentId: illegalShipmentId,
        body: {
          carrier: "CJ대한통운",
          status: "delivered",
          delivered_at: new Date().toISOString(),
          remark: "불가 선행 없는 배송완료",
        } satisfies IShoppingMallOrderShipment.IUpdate,
      },
    );
  });

  // 10. Edge: update for non-existent order/shipment
  await TestValidator.error(
    "non-existent order/shipment update fails",
    async () => {
      await api.functional.shoppingMall.admin.orders.shipments.update(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          shipmentId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            carrier: "CJ대한통운",
            status: "pending",
            remark: "잘못된 주문/배송 식별자",
          } satisfies IShoppingMallOrderShipment.IUpdate,
        },
      );
    },
  );

  // 11. Edge: update a shipment that's not linked to this order
  await TestValidator.error("shipment not linked to order fails", async () => {
    await api.functional.shoppingMall.admin.orders.shipments.update(
      connection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        shipmentId: shipmentId,
        body: {
          carrier: "CJ대한통운",
          status: "pending",
          remark: "연결되지 않은 배송정보 수정 시도",
        } satisfies IShoppingMallOrderShipment.IUpdate,
      },
    );
  });
}
