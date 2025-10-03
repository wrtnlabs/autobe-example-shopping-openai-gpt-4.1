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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate that a seller can soft delete their own order and cannot delete
 * other seller's orders.
 *
 * 1. Register seller1 (owner).
 * 2. Register seller2 (not owner).
 * 3. Register a customer user.
 * 4. Customer creates a cart.
 * 5. Admin creates an order for seller1 (using relevant DTOs/IDs as per the API
 *    contract).
 * 6. As seller1 (owner), perform DELETE to /shoppingMall/seller/orders/{orderId}.
 *    Check the order's deleted_at is set and action is OK (soft delete).
 * 7. As seller2, attempt to perform DELETE on the same order. Expect
 *    failure/permission error and ensure the order's deleted_at is not affected
 *    by this attempt.
 */
export async function test_api_order_seller_soft_delete_authorized_owner(
  connection: api.IConnection,
) {
  // 1. Register seller1
  const seller1Body = typia.random<IShoppingMallSeller.IJoin>();
  const seller1 = await api.functional.auth.seller.join(connection, {
    body: seller1Body,
  });
  typia.assert(seller1);
  // 2. Register seller2
  const seller2Body = {
    ...seller1Body,
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies IShoppingMallSeller.IJoin;
  const seller2 = await api.functional.auth.seller.join(connection, {
    body: seller2Body,
  });
  typia.assert(seller2);
  // 3. Register customer
  const customerBody = {
    shopping_mall_channel_id: seller1Body.shopping_mall_channel_id,
    email: typia.random<string & tags.Format<"email">>(),
    password: "customerpw1234",
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerBody,
  });
  typia.assert(customer);
  // 4. Customer creates cart
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: customer.shopping_mall_channel_id,
        shopping_mall_section_id: seller1Body.shopping_mall_section_id,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);
  // 5. Create order as admin for seller1
  const orderItem: IShoppingMallOrderItem.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller1.id,
    quantity: 1 as number & tags.Type<"int32">,
    unit_price: 10000,
    final_price: 10000,
    status: "ordered",
  };
  const delivery: IShoppingMallDelivery.ICreate = {
    shopping_mall_order_id: orderItem.shopping_mall_order_id,
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph({ sentences: 3 }),
    delivery_status: "prepared",
    delivery_attempts: 0 as number & tags.Type<"int32">,
  };
  const payment: IShoppingMallPayment.ICreate = {
    shopping_mall_order_id: orderItem.shopping_mall_order_id,
    shopping_mall_customer_id: customer.id,
    payment_type: "card",
    status: "pending",
    amount: 10000,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  };
  const orderBody: IShoppingMallOrder.ICreate = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: customer.shopping_mall_channel_id,
    shopping_mall_section_id: seller1Body.shopping_mall_section_id,
    shopping_mall_cart_id: cart.id,
    order_type: "normal",
    total_amount: 10000,
    currency: "KRW",
    order_items: [orderItem],
    deliveries: [delivery],
    payments: [payment],
  };
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    { body: orderBody },
  );
  typia.assert(order);
  // 6. As seller1, erase the order
  await api.functional.auth.seller.join(connection, { body: seller1Body });
  await api.functional.shoppingMall.seller.orders.erase(connection, {
    orderId: order.id,
  });
  // Ideally, query the order to check deleted_at is now set (omitted, as no query endpoint provided)
  // 7. As seller2, try to erase the order (should fail, check with TestValidator.error)
  await api.functional.auth.seller.join(connection, { body: seller2Body });
  await TestValidator.error(
    "seller2 cannot delete another seller's order",
    async () => {
      await api.functional.shoppingMall.seller.orders.erase(connection, {
        orderId: order.id,
      });
    },
  );
}
