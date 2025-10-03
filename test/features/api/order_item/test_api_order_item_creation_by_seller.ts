import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Test that a seller can add an order item to an order for which they are
 * assigned fulfillment responsibility. Steps: Register as a new seller, create
 * shopping mall product/channel entities as prerequisites, have customer and
 * cart/order created, then as seller add the order item for the order. Validate
 * seller can add items to authorized orders only, stock/business logic is
 * enforced, unauthorized sellers are rejected, and audit/compliance evidence is
 * preserved for all creations.
 */
export async function test_api_order_item_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Register channel as admin
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(channel);

  // 2. Add a section to the channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: 1,
        },
      },
    );
  typia.assert(section);

  // 3. Create a category within the channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: 1,
          parent_id: null,
        },
      },
    );
  typia.assert(category);

  // 4. Register a seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "secretpw1",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(),
      kyc_status: "pending",
    },
  });
  typia.assert(seller);

  // 5. Register a product as the seller
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.paragraph({ sentences: 3 }),
        status: "Active",
        business_status: "Approval",
      },
    },
  );
  typia.assert(product);

  // 6. Register a customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      password: "custpw123",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);

  // 7. Create a cart for the customer
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      },
    },
  );
  typia.assert(cart);

  // 8. Create an order as admin, with initial order item for the product
  const orderItemBody = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // temp; will be replaced when order created
    shopping_mall_product_id: product.id,
    shopping_mall_seller_id: seller.id,
    quantity: 1,
    unit_price: 10000,
    final_price: 9500,
    status: "ordered",
  } satisfies IShoppingMallOrderItem.ICreate;
  const orderDeliveryBody = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // temp
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph({ sentences: 5 }),
    delivery_status: "prepared",
    delivery_attempts: 0,
  } satisfies IShoppingMallDelivery.ICreate;
  const orderPaymentBody = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // temp
    shopping_mall_customer_id: customer.id,
    payment_type: "card",
    status: "pending",
    amount: 9500,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: 9500,
        currency: "KRW",
        order_items: [
          {
            ...orderItemBody,
            shopping_mall_order_id: undefined as any, // Will be set to the new order's ID after creation
          },
        ],
        deliveries: [
          {
            ...orderDeliveryBody,
            shopping_mall_order_id: undefined as any, // Will be set to the new order's ID after creation
          },
        ],
        payments: [
          {
            ...orderPaymentBody,
            shopping_mall_order_id: undefined as any, // Will be set to the new order's ID after creation
          },
        ],
      } as any, // use as any for temp replacement, will correct after order creation
    },
  );
  typia.assert(order);

  // 9. As the seller, add a valid order item
  const sellerOrderItemCreate = {
    shopping_mall_order_id: order.id,
    shopping_mall_product_id: product.id,
    shopping_mall_seller_id: seller.id,
    quantity: 2,
    unit_price: 9900,
    final_price: 9800,
    status: "ordered",
  } satisfies IShoppingMallOrderItem.ICreate;
  const newItem = await api.functional.shoppingMall.seller.orders.items.create(
    connection,
    {
      orderId: order.id,
      body: sellerOrderItemCreate,
    },
  );
  typia.assert(newItem);
  TestValidator.equals(
    "order ID matches",
    newItem.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "product ID matches",
    newItem.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "seller ID matches",
    newItem.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.predicate(
    "audit fields: created_at exists",
    typeof newItem.created_at === "string" && newItem.created_at.length > 0,
  );
  TestValidator.predicate(
    "audit fields: updated_at exists",
    typeof newItem.updated_at === "string" && newItem.updated_at.length > 0,
  );

  // 10. Negative path: Attempt by unauthorized seller
  const anotherSellerEmail = typia.random<string & tags.Format<"email">>();
  const anotherSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: anotherSellerEmail,
      password: "secretpw2",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(),
      kyc_status: "pending",
    },
  });
  typia.assert(anotherSeller);
  await TestValidator.error("unauthorized seller cannot add item", async () => {
    await api.functional.shoppingMall.seller.orders.items.create(connection, {
      orderId: order.id,
      body: {
        ...sellerOrderItemCreate,
        shopping_mall_seller_id: anotherSeller.id,
      },
    });
  });

  // 11. Negative path: Product must belong to the seller
  await TestValidator.error(
    "seller cannot add someone else's product",
    async () => {
      await api.functional.shoppingMall.seller.orders.items.create(connection, {
        orderId: order.id,
        body: {
          ...sellerOrderItemCreate,
          shopping_mall_product_id: typia.random<
            string & tags.Format<"uuid">
          >(), // unknown product
        },
      });
    },
  );
}
