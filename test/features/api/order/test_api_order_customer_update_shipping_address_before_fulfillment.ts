import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";

/**
 * Validate customer order shipping address update before fulfillment.
 *
 * This test verifies that a customer can create an account, add two different
 * shipping address snapshots, create an order with one address, and update the
 * order to use the other address before shipment processing.
 *
 * 1. Register a new customer with a default address.
 * 2. Create the first order address snapshot to be used for order.
 * 3. Place an order using the initial order address and a fake payment method.
 * 4. Create a second order address snapshot to simulate the new shipping address.
 * 5. Update the order to use the second address snapshot before shipment.
 * 6. Validate that the order's shipping address has changed.
 * 7. Optionally, try updating again after changing status (should error if
 *    shipped, but can't set status here).
 */
export async function test_api_order_customer_update_shipping_address_before_fulfillment(
  connection: api.IConnection,
) {
  // 1. Register customer (with initial address)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 1 }),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 2 }),
      address_line2: null,
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(customer);

  // 2. Create a new shipping address snapshot for the initial order
  const addressInput1 = {
    address_type: "shipping",
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(6),
    address_main: RandomGenerator.paragraph({ sentences: 2 }),
    address_detail: null,
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;
  const orderAddress1 =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      { body: addressInput1 },
    );
  typia.assert(orderAddress1);

  // 3. Create a new order using the first address and a dummy payment method (id, order_total, currency required)
  const fakePaymentMethodId = typia.random<string & tags.Format<"uuid">>();
  const orderTotal = 10000;
  const currency = "KRW";
  const orderInput = {
    shipping_address_id: orderAddress1.id,
    payment_method_id: fakePaymentMethodId,
    order_total: orderTotal,
    currency: currency,
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    { body: orderInput },
  );
  typia.assert(order);
  TestValidator.equals(
    "shipping address ID should match initial",
    order.shipping_address_id,
    orderAddress1.id,
  );

  // 4. Create another shipping address snapshot for the new address
  const addressInput2 = {
    address_type: "shipping",
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(6),
    address_main: RandomGenerator.paragraph({ sentences: 2 }),
    address_detail: "Apt 999",
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;
  const orderAddress2 =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      { body: addressInput2 },
    );
  typia.assert(orderAddress2);
  TestValidator.notEquals(
    "new and old shipping address IDs should differ",
    orderAddress2.id,
    orderAddress1.id,
  );

  // 5. Update the order's shipping address to the new snapshot
  const updateResult = await api.functional.shoppingMall.customer.orders.update(
    connection,
    {
      orderId: order.id,
      body: {
        shipping_address_id: orderAddress2.id,
      } satisfies IShoppingMallOrder.IUpdate,
    },
  );
  typia.assert(updateResult);
  TestValidator.equals(
    "shipping address ID should be updated",
    updateResult.shipping_address_id,
    orderAddress2.id,
  );

  // 6. Validate no other key fields were accidentally modified
  TestValidator.equals("order ID remains constant", updateResult.id, order.id);
  TestValidator.equals(
    "order status is unchanged after address update",
    updateResult.status,
    order.status,
  );

  // 7. (Negative) Attempting to update with the same address (permitted scenario)
  const updateSame = await api.functional.shoppingMall.customer.orders.update(
    connection,
    {
      orderId: order.id,
      body: {
        shipping_address_id: orderAddress2.id,
      } satisfies IShoppingMallOrder.IUpdate,
    },
  );
  typia.assert(updateSame);
  TestValidator.equals(
    "no change when updating with same address id",
    updateSame.shipping_address_id,
    orderAddress2.id,
  );
}
