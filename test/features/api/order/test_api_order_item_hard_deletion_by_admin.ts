import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate admin hard deletion (removal) of an order item under proper business
 * rules.
 *
 * Steps:
 *
 * 1. Admin registration to establish privileged context.
 * 2. Create an admin-accessible channel (scopes all downstream entities).
 * 3. Add a section and category under the channel for the product association.
 * 4. Register a product as an admin within the defined channel/section/category.
 * 5. Create a customer shopping cart (simulate as needed), referencing the created
 *    product.
 * 6. Create an order backed by the cart (still not paid, fulfilled, or shipped).
 * 7. Insert an order item for the created order. By default, set status to
 *    'ordered' (not yet paid/fulfilled).
 * 8. Perform a hard deletion (erase) of that order item by the admin; validate
 *    that no error is thrown.
 * 9. Confirm deletion by attempting prohibited actions (like re-deleting or
 *    checking list contents), or indirectly via order state if needed.
 * 10. Re-insert an item to the same order, but then change its status to 'paid',
 *     'fulfilled', or 'delivered' (simulate if necessary via direct
 *     update/mocking if real API is unavailable).
 * 11. Attempt to hard-delete the item while in each prohibited state and validate
 *     that the API rejects the operation with a business error (using
 *     TestValidator.error).
 * 12. Confirm compliance snapshot/audit mechanisms are triggered (may be validated
 *     indirectly if logs are inaccessible via API).
 */
export async function test_api_order_item_hard_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin registration
  const adminRegister = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminRegister);

  // Step 2: Channel creation
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 3: Section creation
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(1),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // Step 4: Category creation
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(2),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 5: Product registration
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: adminRegister.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        status: "Draft",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 6: Cart creation (simulate customer; assign admin as customer for test - as there is no customer API in dependencies here)
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: adminRegister.id, // test with admin as customer
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // Step 7: Order creation
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: adminRegister.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: 100,
        currency: "KRW",
        order_items: [],
        deliveries: [],
        payments: [],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 8: Order item creation (test hard deletion eligibility - status 'ordered')
  const orderItem = await api.functional.shoppingMall.admin.orders.items.create(
    connection,
    {
      orderId: order.id,
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_product_id: product.id,
        shopping_mall_seller_id: adminRegister.id,
        quantity: 1,
        unit_price: 100,
        final_price: 100,
        status: "ordered",
      } satisfies IShoppingMallOrderItem.ICreate,
    },
  );
  typia.assert(orderItem);

  // Step 9: Perform hard deletion (should succeed in incomplete state)
  await api.functional.shoppingMall.admin.orders.items.erase(connection, {
    orderId: order.id,
    itemId: orderItem.id,
  });

  // Attempting to delete again should yield an error (item already deleted)
  await TestValidator.error(
    "should fail to erase non-existent order item",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.erase(connection, {
        orderId: order.id,
        itemId: orderItem.id,
      });
    },
  );

  // Step 10+11: Re-insert, change to forbidden states, and ensure deletion is blocked (simulate as much as possible)
  // 10.1 Re-insert an item (new id)
  const orderItem2 =
    await api.functional.shoppingMall.admin.orders.items.create(connection, {
      orderId: order.id,
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_product_id: product.id,
        shopping_mall_seller_id: adminRegister.id,
        quantity: 1,
        unit_price: 100,
        final_price: 100,
        status: "paid",
      } satisfies IShoppingMallOrderItem.ICreate,
    });
  typia.assert(orderItem2);

  await TestValidator.error("prohibit erase if item status paid", async () => {
    await api.functional.shoppingMall.admin.orders.items.erase(connection, {
      orderId: order.id,
      itemId: orderItem2.id,
    });
  });

  // 10.2 Fulfillment state
  const orderItem3 =
    await api.functional.shoppingMall.admin.orders.items.create(connection, {
      orderId: order.id,
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_product_id: product.id,
        shopping_mall_seller_id: adminRegister.id,
        quantity: 1,
        unit_price: 100,
        final_price: 100,
        status: "fulfilled",
      } satisfies IShoppingMallOrderItem.ICreate,
    });
  typia.assert(orderItem3);
  await TestValidator.error(
    "prohibit erase if item status fulfilled",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.erase(connection, {
        orderId: order.id,
        itemId: orderItem3.id,
      });
    },
  );

  // 10.3 Delivered state
  const orderItem4 =
    await api.functional.shoppingMall.admin.orders.items.create(connection, {
      orderId: order.id,
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_product_id: product.id,
        shopping_mall_seller_id: adminRegister.id,
        quantity: 1,
        unit_price: 100,
        final_price: 100,
        status: "delivered",
      } satisfies IShoppingMallOrderItem.ICreate,
    });
  typia.assert(orderItem4);
  await TestValidator.error(
    "prohibit erase if item status delivered",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.erase(connection, {
        orderId: order.id,
        itemId: orderItem4.id,
      });
    },
  );
}
