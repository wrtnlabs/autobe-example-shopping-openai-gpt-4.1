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
 * Validates that only the order owner can soft-delete a delivery. Attempts
 * logical deletion of another customer's delivery should return 403 Forbidden.
 *
 * Steps:
 *
 * 1. Register and login Customer A (will own the order).
 * 2. Create a cart for Customer A.
 * 3. Admin creates an order for Customer A using the cart.
 * 4. Customer A adds a delivery to their order.
 * 5. Register and login Customer B (attacker).
 * 6. Attempt to delete (soft-delete) the delivery on Customer A's order as
 *    Customer B -- must fail with 403.
 */
export async function test_api_order_delivery_logical_delete_customer_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Register and login Customer A
  const customerA_email: string = typia.random<string & tags.Format<"email">>();
  const customerA_channelId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  const customerA_sectionId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: customerA_channelId,
        email: customerA_email,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customerA);

  // 2. Customer A creates a cart
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        shopping_mall_customer_id: customerA.id,
        shopping_mall_channel_id: customerA_channelId,
        shopping_mall_section_id: customerA_sectionId,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cart);

  // 3. Admin creates order for Customer A
  // (Order with at least one item, one delivery, one payment)
  const productId: string = typia.random<string & tags.Format<"uuid">>();
  const sellerId: string = typia.random<string & tags.Format<"uuid">>();
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customerA.id,
        shopping_mall_channel_id: customerA_channelId,
        shopping_mall_section_id: customerA_sectionId,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: 10000,
        currency: "KRW",
        order_items: [
          {
            shopping_mall_order_id: "", // assigned after creation, not required
            shopping_mall_product_id: productId,
            shopping_mall_seller_id: sellerId,
            quantity: 1,
            unit_price: 10000,
            final_price: 10000,
            status: "ordered",
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
        deliveries: [], // we will add delivery separately since API is exposed
        payments: [
          {
            shopping_mall_order_id: "",
            shopping_mall_customer_id: customerA.id,
            payment_type: "card",
            status: "pending",
            amount: 10000,
            currency: "KRW",
            requested_at: new Date().toISOString(),
          } satisfies IShoppingMallPayment.ICreate,
        ],
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);
  const orderId = order.id;

  // 4. Customer A creates a delivery for their order
  const deliveryBody = {
    shopping_mall_order_id: orderId,
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph(),
    delivery_status: "prepared",
    delivery_attempts: 0,
  } satisfies IShoppingMallDelivery.ICreate;
  const delivery: IShoppingMallDelivery =
    await api.functional.shoppingMall.customer.orders.deliveries.create(
      connection,
      {
        orderId: orderId,
        body: deliveryBody,
      },
    );
  typia.assert(delivery);

  // Save deliveryId for deletion attempt
  const deliveryId = delivery.id;

  // 5. Register and login Customer B (attacker)
  const customerB_channelId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  const customerB_email: string = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: customerB_channelId,
      email: customerB_email,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });

  // 6. Customer B attempts to delete Customer A's delivery - must fail
  await TestValidator.error(
    "customer cannot delete another customer's delivery (should be forbidden)",
    async () => {
      await api.functional.shoppingMall.customer.orders.deliveries.erase(
        connection,
        {
          orderId: orderId,
          deliveryId: deliveryId,
        },
      );
    },
  );
}
