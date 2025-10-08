import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Validates that an admin can update an order item (quantity, unit price)
 * before fulfillment or cancellation. Covers both successful updates and
 * invalid update attempts.
 *
 * Steps:
 *
 * 1. Register admin and get authorized
 * 2. Create a shipping address snapshot
 * 3. Create a payment method snapshot
 * 4. Admin creates a new order referencing address & payment method
 * 5. Admin adds an item to the order
 * 6. Admin updates the order item (valid update)
 * 7. Attempt invalid update (negative quantity)
 */
export async function test_api_admin_update_order_item_before_fulfillment(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "test1234!",
      full_name: RandomGenerator.name(),
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create order address
  const address =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(2),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 2 }),
          address_detail: RandomGenerator.paragraph({ sentences: 1 }),
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(address);

  // 3. Create payment method snapshot
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: JSON.stringify({ card: "****-****-****-1234" }),
          display_name: "Visa ****-1234",
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 4. Admin creates order (need a valid customer id, chosen randomly)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const orderTotal = 10000;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerId,
        shipping_address_id: address.id,
        payment_method_id: paymentMethod.id,
        order_total: orderTotal,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 5. Admin adds an item to the order
  const orderItem = await api.functional.shoppingMall.admin.orders.items.create(
    connection,
    {
      orderId: order.id,
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_product_sku_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        item_name: RandomGenerator.paragraph({ sentences: 2 }),
        sku_code: RandomGenerator.alphaNumeric(8),
        quantity: 2,
        unit_price: 4000,
        currency: "KRW",
        item_total: 8000,
      } satisfies IShoppingMallOrderItem.ICreate,
    },
  );
  typia.assert(orderItem);

  // 6. Admin updates the order item (quantity and unit_price)
  const updatedQuantity = 3;
  const updatedPrice = 3500;
  const updatedOrderItem =
    await api.functional.shoppingMall.admin.orders.items.update(connection, {
      orderId: order.id,
      itemId: orderItem.id,
      body: {
        quantity: updatedQuantity,
        unit_price: updatedPrice,
      } satisfies IShoppingMallOrderItem.IUpdate,
    });
  typia.assert(updatedOrderItem);
  TestValidator.equals(
    "quantity updated",
    updatedOrderItem.quantity,
    updatedQuantity,
  );
  TestValidator.equals(
    "unit_price updated",
    updatedOrderItem.unit_price,
    updatedPrice,
  );

  // 7. Attempt invalid update (negative quantity)
  await TestValidator.error(
    "should fail to update with negative quantity",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.update(connection, {
        orderId: order.id,
        itemId: orderItem.id,
        body: {
          quantity: -1,
        } satisfies IShoppingMallOrderItem.IUpdate,
      });
    },
  );
}
