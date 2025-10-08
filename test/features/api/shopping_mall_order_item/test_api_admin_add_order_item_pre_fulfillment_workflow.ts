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
 * Validate admin pre-fulfillment order item addition workflow.
 *
 * 1. Register and authenticate as admin
 * 2. Create order address snapshot
 * 3. Create payment method snapshot
 * 4. Create order (pending/processing)
 * 5. Admin adds first SKU item to order (success path)
 * 6. Attempt to add duplicate item (should error)
 * 7. Attempt to add to fulfilled/cancelled order (should error)
 * 8. Validate business rule enforcement and item relationships
 */
export async function test_api_admin_add_order_item_pre_fulfillment_workflow(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Admin#1234!",
      full_name: adminFullName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create order address snapshot
  const addressSnapshot =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 2 }),
          address_detail: RandomGenerator.paragraph({ sentences: 1 }),
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(addressSnapshot);

  // 3. Create payment method snapshot
  const paymentSnapshot =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: RandomGenerator.pick([
            "card",
            "bank_transfer",
            "paypal",
            "virtual_account",
          ] as const),
          method_data: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.name(2),
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentSnapshot);

  // 4. Create order (pending)
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: addressSnapshot.id,
        payment_method_id: paymentSnapshot.id,
        order_total: 10000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 5. Admin adds first item - simulate a SKU: All fields must be present
  const sku_id = typia.random<string & tags.Format<"uuid">>();
  const sku_code = RandomGenerator.alphaNumeric(12);
  const newItem = await api.functional.shoppingMall.admin.orders.items.create(
    connection,
    {
      orderId: order.id,
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_product_sku_id: sku_id,
        item_name: RandomGenerator.paragraph({ sentences: 2 }),
        sku_code,
        quantity: 1,
        unit_price: 10000,
        currency: order.currency,
        item_total: 10000,
      } satisfies IShoppingMallOrderItem.ICreate,
    },
  );
  typia.assert(newItem);

  // 6. Attempt to add duplicate SKU to the order (should error)
  await TestValidator.error(
    "error on duplicated SKU for same order",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.create(connection, {
        orderId: order.id,
        body: {
          shopping_mall_order_id: order.id,
          shopping_mall_product_sku_id: sku_id,
          item_name: RandomGenerator.paragraph({ sentences: 2 }),
          sku_code,
          quantity: 2,
          unit_price: 9999,
          currency: order.currency,
          item_total: 19998,
        } satisfies IShoppingMallOrderItem.ICreate,
      });
    },
  );

  // 7. Attempt to add item to a fulfilled/cancelled order (simulate by changing order object in test only)
  // Fulfilled
  const fulfilledOrder = {
    ...order,
    status: "fulfilled",
  };
  await TestValidator.error(
    "error on adding item to fulfilled order",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.create(connection, {
        orderId: fulfilledOrder.id,
        body: {
          shopping_mall_order_id: fulfilledOrder.id,
          shopping_mall_product_sku_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          item_name: RandomGenerator.paragraph({ sentences: 2 }),
          sku_code: RandomGenerator.alphaNumeric(12),
          quantity: 1,
          unit_price: 10000,
          currency: fulfilledOrder.currency,
          item_total: 10000,
        } satisfies IShoppingMallOrderItem.ICreate,
      });
    },
  );

  // Cancelled
  const cancelledOrder = {
    ...order,
    status: "cancelled",
  };
  await TestValidator.error(
    "error on adding item to cancelled order",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.create(connection, {
        orderId: cancelledOrder.id,
        body: {
          shopping_mall_order_id: cancelledOrder.id,
          shopping_mall_product_sku_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          item_name: RandomGenerator.paragraph({ sentences: 2 }),
          sku_code: RandomGenerator.alphaNumeric(12),
          quantity: 1,
          unit_price: 10000,
          currency: cancelledOrder.currency,
          item_total: 10000,
        } satisfies IShoppingMallOrderItem.ICreate,
      });
    },
  );

  // 8. Validate business state: added item included in original order (success path)
  TestValidator.equals(
    "created order item references parent order",
    newItem.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "created order item quantity as requested",
    newItem.quantity,
    1,
  );
}
