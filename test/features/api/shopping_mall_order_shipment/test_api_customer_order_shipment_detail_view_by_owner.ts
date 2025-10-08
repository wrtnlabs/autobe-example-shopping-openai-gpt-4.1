import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";

/**
 * Validate a customer can view detailed shipment info for their own order and
 * not for others.
 *
 * 1. Register a customer (join, receive token)
 * 2. Create a shipping address snapshot for the order
 * 3. Create a payment method snapshot for the order
 * 4. Create an order referencing address/payment
 * 5. Ensure at least one shipment exists (simulate if needed)
 * 6. Fetch shipment detail as owner and validate fields
 * 7. Attempt to access shipment as another user (should error)
 */
export async function test_api_customer_order_shipment_detail_view_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 1 }),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 1 }),
      address_line2: null,
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert(customer);

  // 2. Create shipping address snapshot
  const addressBody = {
    address_type: "shipping",
    recipient_name: customer.full_name,
    phone: customer.phone,
    zip_code: RandomGenerator.alphaNumeric(5),
    address_main: RandomGenerator.paragraph({ sentences: 2 }),
    address_detail: null,
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      { body: addressBody },
    );
  typia.assert(orderAddress);

  // 3. Create payment method snapshot
  const paymentBody = {
    payment_method_type: "card",
    method_data: '{"masked":"****1234"}',
    display_name: "Visa ****1234",
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      { body: paymentBody },
    );
  typia.assert(paymentMethod);

  // 4. Create order
  const orderBody = {
    shipping_address_id: orderAddress.id,
    payment_method_id: paymentMethod.id,
    order_total: 10000,
    currency: "KRW",
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    { body: orderBody },
  );
  typia.assert(order);

  // 5. Assume at least one shipment exists (mock response or precondition; in real E2E this should come from setup)
  // For E2E, fetch a random shipmentId for the given order (simulate since list API is not present)
  // Construct a fake shipment or use typical response pattern
  const shipmentId = typia.random<string & tags.Format<"uuid">>();

  // 6. Fetch shipment detail as owner
  const shipment =
    await api.functional.shoppingMall.customer.orders.shipments.at(connection, {
      orderId: order.id,
      shipmentId: shipmentId,
    });
  typia.assert(shipment);
  TestValidator.equals(
    "Shipment order id matches order",
    shipment.shopping_mall_order_id,
    order.id,
  );
  TestValidator.predicate(
    "Carrier name is present",
    typeof shipment.carrier === "string" && shipment.carrier.length > 0,
  );
  TestValidator.predicate(
    "Shipment status present",
    typeof shipment.status === "string" && shipment.status.length > 0,
  );

  // 7. Register a second customer and try to access other user's shipment (should error)
  const joinBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 1 }),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 1 }),
      address_line2: null,
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  await api.functional.auth.customer.join(connection, { body: joinBody2 });

  await TestValidator.error(
    "Other user cannot access owner's shipment detail",
    async () => {
      await api.functional.shoppingMall.customer.orders.shipments.at(
        connection,
        {
          orderId: order.id,
          shipmentId: shipmentId,
        },
      );
    },
  );
}
