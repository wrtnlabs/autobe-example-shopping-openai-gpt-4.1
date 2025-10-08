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
 * Validates admin's ability to retrieve order item (SKU line) details with
 * correct structure and access rules.
 *
 * 1. Register an admin user (required for administrative item access).
 * 2. Create a shipping address snapshot (customer-side, used for order creation).
 * 3. Create a payment method snapshot (admin-side for the order).
 * 4. Create a new customer order using the generated address and payment method,
 *    using random order_total/currency.
 * 5. Add an order item to the order as admin (representing a SKU line/variant
 *    purchase).
 * 6. Retrieve item details by orderId+itemId as admin; validate all fields
 *    (quantity, price, item/SKU name, etc).
 * 7. Attempt retrieval with invalid orderId or itemId (expect error).
 * 8. Attempt retrieval as non-admin (expect error for authorization).
 */
export async function test_api_admin_order_item_detail_retrieval_with_proper_authorization(
  connection: api.IConnection,
) {
  // Step 1. Register admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: adminFullName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2. Create customer order address snapshot
  const address: IShoppingMallOrderAddress =
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
  typia.assert(address);

  // Step 3. Create order payment method snapshot
  const pm: IShoppingMallOrderPaymentMethod =
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
          method_data: RandomGenerator.alphaNumeric(24),
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(pm);

  // Step 4. Create customer order referencing address/payment
  const orderTotal = Math.floor(Math.random() * 100000) + 10000;
  const currency = RandomGenerator.pick(["KRW", "USD", "EUR"] as const);
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shipping_address_id: address.id,
        payment_method_id: pm.id,
        order_total: orderTotal,
        currency: currency,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // Step 5. Add an item to the order as admin
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const itemQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const unitPrice = Math.floor(Math.random() * 10000) + 100;
  const itemName = RandomGenerator.name();
  const skuCode = RandomGenerator.alphaNumeric(8);

  const orderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.create(connection, {
      orderId: order.id,
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_product_sku_id: skuId,
        item_name: itemName,
        sku_code: skuCode,
        quantity: itemQuantity,
        unit_price: unitPrice,
        currency: currency,
        item_total: unitPrice * itemQuantity,
      } satisfies IShoppingMallOrderItem.ICreate,
    });
  typia.assert(orderItem);

  // Step 6. Retrieve item detail as admin
  const retrieved: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.at(connection, {
      orderId: order.id,
      itemId: orderItem.id,
    });
  typia.assert(retrieved);

  TestValidator.equals("order item id matches", retrieved.id, orderItem.id);
  TestValidator.equals(
    "parent order id matches",
    retrieved.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "item SKU id matches",
    retrieved.shopping_mall_product_sku_id,
    skuId,
  );
  TestValidator.equals("SKU code matches", retrieved.sku_code, skuCode);
  TestValidator.equals("item_name matches", retrieved.item_name, itemName);
  TestValidator.equals("quantity matches", retrieved.quantity, itemQuantity);
  TestValidator.equals("unit price matches", retrieved.unit_price, unitPrice);
  TestValidator.equals(
    "item total matches",
    retrieved.item_total,
    unitPrice * itemQuantity,
  );
  TestValidator.equals("currency matches", retrieved.currency, currency);
  TestValidator.predicate(
    "refund_status present",
    typeof retrieved.refund_status === "string" &&
      retrieved.refund_status.length > 0,
  );

  // Step 7. Attempt retrieval with invalid IDs
  await TestValidator.error(
    "retrieval fails for unrelated order/itemId",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.at(connection, {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        itemId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // Step 8. Attempt retrieval as non-admin
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated retrieval forbidden", async () => {
    await api.functional.shoppingMall.admin.orders.items.at(unauthConn, {
      orderId: order.id,
      itemId: orderItem.id,
    });
  });
}
