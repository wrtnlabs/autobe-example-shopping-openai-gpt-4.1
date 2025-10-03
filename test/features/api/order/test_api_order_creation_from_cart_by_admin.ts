import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate that admin can create an order from an existing customer cart.
 *
 * 1. Admin registers (admin auth for order creation)
 * 2. Admin registers a channel
 * 3. Admin registers a section in the channel
 * 4. Admin registers a category in the channel
 * 5. Admin creates a product for sale in the channel/section/category
 * 6. Customer registers
 * 7. Customer creates a shopping cart for the given channel/section
 * 8. Customer adds the product to the cart
 * 9. Admin creates an order using the existing cart by assembling all necessary
 *    order data (order items, delivery, payments)
 * 10. Validate that the order is created with proper references to cart, items,
 *     customer, and business side effects are visible (payments, deliveries,
 *     etc)
 */
export async function test_api_order_creation_from_cart_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registers
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminpass123",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Register channel
  const channelCode = RandomGenerator.alphaNumeric(8);
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: channelCode,
        name: `Channel ${RandomGenerator.paragraph({ sentences: 2 })}`,
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Register section
  const sectionCode = RandomGenerator.alphaNumeric(5);
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: sectionCode,
          name: `Section ${RandomGenerator.paragraph({ sentences: 2 })}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Register category
  const categoryCode = RandomGenerator.alphaNumeric(5);
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: categoryCode,
          name: `Category ${RandomGenerator.paragraph({ sentences: 2 })}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Create a product (as admin, seller id random)
  const sellerId = typia.random<string & tags.Format<"uuid">>(); // Admin chooses seller (simulate)
  const productCode = RandomGenerator.alphaNumeric(10);
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerId,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: productCode,
        name: `Product ${RandomGenerator.paragraph({ sentences: 2 })}`,
        status: "Active",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Customer registers
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      password: "custpass123",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 7. Customer creates cart
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // 8. Customer adds product to the cart
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        shopping_mall_product_id: product.id,
        quantity: 1,
        option_snapshot: "{}",
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // 9. Admin creates an order from this cart
  const orderBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_cart_id: cart.id,
    order_type: "normal",
    total_amount: 10000,
    currency: "KRW",
    order_items: [
      {
        shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // not known until order created, use random
        shopping_mall_product_id: product.id,
        shopping_mall_seller_id: sellerId,
        quantity: 1,
        unit_price: 10000,
        final_price: 10000,
        status: "ordered",
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    deliveries: [
      {
        shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
        recipient_name: customer.name,
        recipient_phone: customer.phone!,
        address_snapshot: RandomGenerator.paragraph({ sentences: 6 }),
        delivery_status: "prepared",
        delivery_attempts: 0,
      } satisfies IShoppingMallDelivery.ICreate,
    ],
    payments: [
      {
        shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_customer_id: customer.id,
        payment_type: "card",
        status: "pending",
        amount: 10000,
        currency: "KRW",
        requested_at: new Date().toISOString(),
      } satisfies IShoppingMallPayment.ICreate,
    ],
  } satisfies IShoppingMallOrder.ICreate;

  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: orderBody,
    },
  );
  typia.assert(order);
  TestValidator.equals(
    "order is created with expected shopping_mall_cart_id",
    order.shopping_mall_cart_id,
    cart.id,
  );
  TestValidator.equals(
    "order is created with expected shopping_mall_customer_id",
    order.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "order is created with expected channel id",
    order.shopping_mall_channel_id,
    channel.id,
  );
  TestValidator.equals(
    "order has associated order items",
    Array.isArray(order.order_items) && order.order_items.length > 0,
    true,
  );
  TestValidator.equals(
    "order has associated payment records",
    Array.isArray(order.payments) && order.payments.length > 0,
    true,
  );
  TestValidator.equals(
    "order has associated delivery records",
    Array.isArray(order.deliveries) && order.deliveries.length > 0,
    true,
  );
}
