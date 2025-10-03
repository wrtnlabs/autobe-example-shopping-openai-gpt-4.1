import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate admin retrieval of after-sales service detail for a specific order.
 *
 * Steps:
 *
 * 1. Register admin account
 * 2. Register customer account
 * 3. Customer creates a shopping cart
 * 4. Admin creates an order for the customer referencing cart/channel/section
 * 5. (Optional) Customer creates delivery for order
 * 6. Admin creates after-sale service for the order (may reference delivery)
 * 7. Admin fetches after-sale service detail and verifies linkage and type
 * 8. Test error retrieval with fake afterSaleServiceId (should not exist)
 * 9. (optional) Test access failure for customer/self or other roles
 */
export async function test_api_after_sale_service_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "A1b2C3d4e5", // Strong password
      name: adminName,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerName = RandomGenerator.name();
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customerEmail,
      password: "Z8a7B6c5D4",
      name: customerName,
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 3. Customer creates a cart
  await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customerEmail,
      password: "Z8a7B6c5D4",
      name: customerName,
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  }); // simulate token
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // 4. Admin creates order for customer (with cart)
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "A1b2C3d4e5",
      name: adminName,
    } satisfies IShoppingMallAdmin.IJoin,
  }); // ensure admin token
  const productId = typia.random<string & tags.Format<"uuid">>();
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const orderItemCreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_id: productId,
    shopping_mall_seller_id: sellerId,
    quantity: 1 satisfies number,
    unit_price: 10000,
    final_price: 9000,
    status: "ordered",
  } satisfies IShoppingMallOrderItem.ICreate;
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: 9000,
        currency: "KRW",
        order_items: [orderItemCreate],
        deliveries: [],
        payments: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_customer_id: customer.id,
            payment_type: "card",
            status: "paid",
            amount: 9000,
            currency: "KRW",
            requested_at: new Date().toISOString(),
          } satisfies IShoppingMallPayment.ICreate,
        ],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 5. Customer creates delivery (if possible) -- simulate login as customer
  await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customerEmail,
      password: "Z8a7B6c5D4",
      name: customerName,
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const deliveryCreate = {
    shopping_mall_order_id: order.id,
    recipient_name: customerName,
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.content({ paragraphs: 1 }),
    delivery_status: "prepared",
    delivery_attempts: 1 satisfies number,
  } satisfies IShoppingMallDelivery.ICreate;
  const delivery =
    await api.functional.shoppingMall.customer.orders.deliveries.create(
      connection,
      {
        orderId: order.id,
        body: deliveryCreate,
      },
    );
  typia.assert(delivery);

  // 6. Admin (token) creates after-sale service on the order (optionally attach delivery)
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "A1b2C3d4e5",
      name: adminName,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const afterSaleBody = {
    case_type: "refund",
    shopping_mall_delivery_id: delivery.id,
    reason: RandomGenerator.paragraph({ sentences: 5 }),
    evidence_snapshot: RandomGenerator.paragraph({ sentences: 5 }),
    resolution_message: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallAfterSaleService.ICreate;
  const afterSale =
    await api.functional.shoppingMall.admin.orders.afterSaleServices.create(
      connection,
      {
        orderId: order.id,
        body: afterSaleBody,
      },
    );
  typia.assert(afterSale);

  // 7. Admin retrieves after-sales service by id
  const result =
    await api.functional.shoppingMall.admin.orders.afterSaleServices.at(
      connection,
      {
        orderId: order.id,
        afterSaleServiceId: afterSale.id,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "Returned after-sale service must match ID",
    result.id,
    afterSale.id,
  );
  TestValidator.equals(
    "Linked delivery ID",
    result.shopping_mall_delivery_id,
    delivery.id,
  );
  TestValidator.equals(
    "Linked order ID",
    result.shopping_mall_order_id,
    order.id,
  );

  // 8. Error test: Try to retrieve with invalid afterSaleServiceId
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Should fail for non-existent afterSaleServiceId",
    async () => {
      await api.functional.shoppingMall.admin.orders.afterSaleServices.at(
        connection,
        {
          orderId: order.id,
          afterSaleServiceId: fakeId,
        },
      );
    },
  );
}
