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

/**
 * Simulate a full order lifecycle from creation to admin update and validation
 * of business rules for updates.
 *
 * This test validates admin update permissions and restrictions for e-commerce
 * orders, including correct field updates and error scenarios if order state
 * prohibits updates.
 *
 * Steps:
 *
 * 1. Register admin to obtain credentials
 * 2. Register customer to use for placing an order
 * 3. Customer creates a shipping address snapshot
 * 4. Admin creates a payment method snapshot
 * 5. Customer places an order, referencing the shipping address and payment method
 *    snapshots
 * 6. Admin updates the order's shipping address, payment method, and status
 * 7. Validate that updated fields are changed
 * 8. Attempt updating a delivered/canceled order to check business rule
 *    enforcement (should fail if restrictions apply)
 */
export async function test_api_admin_order_update_complete_lifecycle(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = `${RandomGenerator.alphaNumeric(12)}@admin.test.com`;
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      status: "active",
    },
  });
  typia.assert(admin);

  // 2. Register customer
  const customerEmail = `${RandomGenerator.alphaNumeric(12)}@customer.test.com`;
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerAddressBody = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    region: "Seoul",
    postal_code: RandomGenerator.alphaNumeric(5),
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    address_line2: null,
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: customerAddressBody,
    },
  });
  typia.assert(customer);

  // 3. Customer creates shipping address snapshot
  const shippingAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: customer.full_name,
          phone: customer.phone,
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 2 }),
          address_detail: RandomGenerator.paragraph({ sentences: 1 }),
          country_code: "KOR",
        },
      },
    );
  typia.assert(shippingAddress);

  // 4. Admin creates payment method snapshot
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: JSON.stringify({
            card_last4: RandomGenerator.alphaNumeric(4),
          }),
          display_name: "Visa ****" + RandomGenerator.alphaNumeric(4),
        },
      },
    );
  typia.assert(paymentMethod);

  // 5. Customer places order (using shipping address + payment method)
  const orderBody = {
    shopping_mall_customer_id: customer.id,
    shipping_address_id: shippingAddress.id,
    payment_method_id: paymentMethod.id,
    order_total: 10000,
    currency: "KRW",
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: orderBody,
    },
  );
  typia.assert(order);

  // 6. Admin updates the order's shipping address, payment method, and status
  // Create new address/payment snapshot for update
  const newAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: customer.full_name,
          phone: customer.phone,
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 2 }),
          address_detail: RandomGenerator.paragraph({ sentences: 1 }),
          country_code: "KOR",
        },
      },
    );
  typia.assert(newAddress);

  const newPayment =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "bank_transfer",
          method_data: JSON.stringify({ bank: "SHINHAN", mask: "****1234" }),
          display_name: "Shinhan Bank ****1234",
        },
      },
    );
  typia.assert(newPayment);

  // Update order with new address, payment method, and status
  const updatedOrder = await api.functional.shoppingMall.admin.orders.update(
    connection,
    {
      orderId: order.id,
      body: {
        shipping_address_id: newAddress.id,
        payment_method_id: newPayment.id,
        status: "processing",
        remark: "Admin address/payment update during processing",
      },
    },
  );
  typia.assert(updatedOrder);

  // Verify update
  TestValidator.equals(
    "order shipping address updated",
    updatedOrder.shipping_address_id,
    newAddress.id,
  );
  TestValidator.equals(
    "order payment method updated",
    updatedOrder.payment_method_id,
    newPayment.id,
  );
  TestValidator.equals(
    "order status updated",
    updatedOrder.status,
    "processing",
  );
  TestValidator.equals("order id stable", updatedOrder.id, order.id);

  // 7. Attempt forbidden update (e.g., when status is delivered/cancelled)
  // Simulate delivered status by updating again
  const deliveredOrder = await api.functional.shoppingMall.admin.orders.update(
    connection,
    {
      orderId: order.id,
      body: {
        status: "delivered",
      },
    },
  );
  typia.assert(deliveredOrder);
  TestValidator.equals(
    "order status delivered",
    deliveredOrder.status,
    "delivered",
  );

  // Attempt update after delivery should fail for some fields (simulate business rules)
  await TestValidator.error(
    "cannot change shipping/payment after delivery",
    async () => {
      await api.functional.shoppingMall.admin.orders.update(connection, {
        orderId: order.id,
        body: {
          shipping_address_id: shippingAddress.id,
          payment_method_id: paymentMethod.id,
        },
      });
    },
  );
}
