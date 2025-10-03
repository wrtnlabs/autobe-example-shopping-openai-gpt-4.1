import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Tests hard deletion of a shopping mall order item as a seller before the item
 * is fulfilled (i.e., before shipping/payment/delivery occurs).
 *
 * Business context:
 *
 * - The seller must be onboarded and authenticated. Full dependency setup
 *   includes channel, section, category, product, admin-created cart, and a
 *   newly created order with an item for testing deletion.
 * - Delete must succeed if invoked before fulfillment—therefore the order item is
 *   created in the initial state (not paid, shipped, delivered). Successful
 *   deletion means the item is completely removed and not accessible
 *   afterward.
 * - If the order/item is advanced to a finalized state (paid/shipped/delivered),
 *   deletion must be rejected by the business rule enforcement.
 * - All audit trails for removal must be preserved on backend (not directly
 *   checked here, but deletion is expected to be hard remove from primary
 *   table).
 *
 * Test flow:
 *
 * 1. Register a new seller via auth.seller.join()
 * 2. Create a channel (admin.channels.create)
 * 3. Create a section in the channel (admin.channels.sections.create)
 * 4. Create a category in the channel (admin.channels.categories.create)
 * 5. Create a product belonging to the seller/channel/section/category
 *    (admin.products.create)
 * 6. Create a cart for an arbitrary customer (customer.carts.create)
 * 7. Create an order via admin.orders.create (referencing the prepared product and
 *    cart)
 * 8. Add an item to the order (admin.orders.items.create), referencing the created
 *    product, order, and seller
 * 9. As the seller (using the onboarding auth token), call
 *    seller.orders.items.erase() on the created item (should succeed; expect
 *    item is removed).
 * 10. Try to delete the same item again (should fail; item does not exist)
 * 11. (Edge) Attempt deletion for an item in a finalized status (simulate by
 *     re-creating, advancing state, and attempting erase—should fail and throw
 *     error).
 *
 * Assertions:
 *
 * - Deletion result must not throw (if prior status is eligible)
 * - Second deletion (double-delete) produces error (already absent)
 * - Deletion for item in finalized status throws error
 */
export async function test_api_order_item_hard_deletion_by_seller(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
      shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
      profile_name: RandomGenerator.name(),
      kyc_status: "pending",
    },
  });
  typia.assert(sellerJoin);

  // 2. Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(channel);

  // 3. Create section
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          display_order: 1,
        },
      },
    );
  typia.assert(section);

  // 4. Create category
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: undefined,
          code: RandomGenerator.alphaNumeric(4),
          name: RandomGenerator.name(),
          display_order: 1,
        },
      },
    );
  typia.assert(category);

  // 5. Create product
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerJoin.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        status: "Active",
        business_status: "Approval",
      },
    },
  );
  typia.assert(product);

  // 6. Create customer cart (simulate customer)
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      },
    },
  );
  typia.assert(cart);

  // 7. Create initial order with order item
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: cart.shopping_mall_customer_id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: 3000,
        currency: "KRW",
        order_items: [
          {
            shopping_mall_order_id: "", // will be replaced after order is created
            shopping_mall_product_id: product.id,
            shopping_mall_seller_id: sellerJoin.id,
            quantity: 1,
            unit_price: 3000,
            final_price: 3000,
            status: "ordered",
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
        deliveries: [],
        payments: [],
      },
    },
  );
  typia.assert(order);
  // since order_items[0].shopping_mall_order_id is empty, item will point to order.id
  const orderItemId = order.order_items![0].id;

  // 9. Seller deletes the order item before fulfillment
  await api.functional.shoppingMall.seller.orders.items.erase(connection, {
    orderId: order.id,
    itemId: orderItemId,
  });
  // Success – deletion should not throw

  // 10. Try to delete the same item again (should fail)
  await TestValidator.error(
    "double delete of already-removed item fails",
    async () => {
      await api.functional.shoppingMall.seller.orders.items.erase(connection, {
        orderId: order.id,
        itemId: orderItemId,
      });
    },
  );

  // 11. Create another order/item in finalized status and try deletion (should fail)
  const finalizedOrder = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: cart.shopping_mall_customer_id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: 3000,
        currency: "KRW",
        order_items: [
          {
            shopping_mall_order_id: "",
            shopping_mall_product_id: product.id,
            shopping_mall_seller_id: sellerJoin.id,
            quantity: 1,
            unit_price: 3000,
            final_price: 3000,
            status: "paid",
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
        deliveries: [],
        payments: [],
      },
    },
  );
  typia.assert(finalizedOrder);
  const finalizedItemId = finalizedOrder.order_items![0].id;

  await TestValidator.error(
    "deleting item in finalized state should fail",
    async () => {
      await api.functional.shoppingMall.seller.orders.items.erase(connection, {
        orderId: finalizedOrder.id,
        itemId: finalizedItemId,
      });
    },
  );
}
