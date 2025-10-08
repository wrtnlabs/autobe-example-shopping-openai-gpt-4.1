import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Validate detail retrieval of an order item by a customer for audit and
 * business correctness.
 *
 * Steps:
 *
 * 1. Register a customer via /auth/customer/join.
 * 2. Create immutable order address with /shoppingMall/customer/orderAddresses.
 * 3. Create order payment method snapshot with
 *    /shoppingMall/admin/orderPaymentMethods.
 * 4. Place an order as customer, providing the address and payment method
 *    snapshot.
 * 5. Admin adds an order item (mimicking SKU purchase) to this order.
 * 6. Customer retrieves the specific order item using
 *    /shoppingMall/customer/orders/{orderId}/items/{itemId}.
 * 7. Check all relevant fields (SKU, name, code, quantity, unit price, item total,
 *    currency, refund status, audit fields) are correct.
 * 8. Test error responses: (a) access to non-existent item, (b) unauthorized user
 *    accesses other's order item.
 */
export async function test_api_order_item_detail_view_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registers
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 1 }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        address_line2: RandomGenerator.paragraph({ sentences: 1 }),
        is_default: true,
      },
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create order address snapshot (shipping)
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: joinResult.full_name,
          phone: joinResult.phone,
          zip_code: "04500",
          address_main: RandomGenerator.paragraph({ sentences: 2 }),
          address_detail: RandomGenerator.paragraph({ sentences: 1 }),
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 3. Create payment method snapshot (admin endpoint for test flow)
  const paymentMethod =
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
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 4. Place order as customer (does NOT include order items in the API)
  const orderTotal = 10000;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: orderTotal,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  TestValidator.predicate(
    "order status is valid",
    typeof order.status === "string" && order.status.length > 0,
  );
  TestValidator.equals("order total matches", order.order_total, orderTotal);

  // 5. Admin adds order item via admin endpoint
  const productSkuId = typia.random<string & tags.Format<"uuid">>();
  const itemName = RandomGenerator.paragraph({ sentences: 2 });
  const skuCode = RandomGenerator.alphaNumeric(12);
  const quantity = 2;
  const unitPrice = 5000;
  const itemTotal = unitPrice * quantity;
  const orderItem = await api.functional.shoppingMall.admin.orders.items.create(
    connection,
    {
      orderId: order.id,
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_product_sku_id: productSkuId,
        item_name: itemName,
        sku_code: skuCode,
        quantity: quantity,
        unit_price: unitPrice,
        currency: "KRW",
        item_total: itemTotal,
      } satisfies IShoppingMallOrderItem.ICreate,
    },
  );
  typia.assert(orderItem);
  TestValidator.equals(
    "orderItem mapped to correct order",
    orderItem.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals("quantity matches", orderItem.quantity, quantity);
  TestValidator.equals("unit price matches", orderItem.unit_price, unitPrice);
  TestValidator.equals("item total matches", orderItem.item_total, itemTotal);
  TestValidator.equals("currency matches", orderItem.currency, "KRW");
  TestValidator.predicate(
    "orderItem status present",
    typeof orderItem.refund_status === "string" &&
      orderItem.refund_status.length > 0,
  );

  // 6. Customer retrieves order item detail
  const retrieved = await api.functional.shoppingMall.customer.orders.items.at(
    connection,
    {
      orderId: order.id,
      itemId: orderItem.id,
    },
  );
  typia.assert(retrieved);
  TestValidator.equals("retrieved matches created item", retrieved, orderItem);

  // 7. Error: access non-existent itemId
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent item retrieval fails", async () => {
    await api.functional.shoppingMall.customer.orders.items.at(connection, {
      orderId: order.id,
      itemId: fakeId,
    });
  });

  // 8. Error: unauthorized user (register a new customer)
  const altCustomer = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 1 }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        address_line2: RandomGenerator.paragraph({ sentences: 1 }),
        is_default: true,
      },
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(altCustomer);

  await TestValidator.error(
    "unauthorized user cannot view other's order item",
    async () => {
      await api.functional.shoppingMall.customer.orders.items.at(connection, {
        orderId: order.id,
        itemId: orderItem.id,
      });
    },
  );
}
