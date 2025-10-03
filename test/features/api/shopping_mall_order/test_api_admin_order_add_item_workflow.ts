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

export async function test_api_admin_order_add_item_workflow(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
      },
    });
  typia.assert(admin);

  // 2. Create a channel
  const channelCreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelCreate,
    });
  typia.assert(channel);

  // 3. Create a section in the channel
  const sectionCreate = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.ICreate;
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionCreate,
      },
    );
  typia.assert(section);

  // 4. Create a category in the channel
  const categoryCreate = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: categoryCreate,
      },
    );
  typia.assert(category);

  // 5. Register a product in the created channel, section, and category
  const productCreate = {
    shopping_mall_seller_id: admin.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    business_status: "approved",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productCreate,
    });
  typia.assert(product);

  // 6. Create a customer cart as prerequisite for order creation
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const cartCreate = {
    shopping_mall_customer_id: customerId,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    source: "member",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreate,
    });
  typia.assert(cart);

  // 7. Create a new order for the admin workflow referencing the cart
  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // placeholder, will fix below
    shopping_mall_product_id: product.id,
    shopping_mall_seller_id: admin.id,
    quantity: 1 as number & tags.Type<"int32">,
    unit_price: 10000,
    final_price: 10000,
    status: "ordered",
  };
  // We need to assign actual order_id after order created, so skip for now
  const deliveryCreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // placeholder
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph({ sentences: 5 }),
    delivery_status: "prepared",
    delivery_attempts: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallDelivery.ICreate;
  const paymentCreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // placeholder
    shopping_mall_customer_id: customerId,
    payment_type: "card",
    status: "pending",
    amount: 10000,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;
  const orderCreate = {
    shopping_mall_customer_id: customerId,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_cart_id: cart.id,
    order_type: "normal",
    total_amount: 10000,
    currency: "KRW",
    order_items: [],
    deliveries: [],
    payments: [],
  } satisfies IShoppingMallOrder.ICreate;
  // Create the order with no items initially for the add item test
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.create(connection, {
      body: orderCreate,
    });
  typia.assert(order);

  // 8. Add a new item to the above order (success case)
  const addItemInput = {
    shopping_mall_order_id: order.id,
    shopping_mall_product_id: product.id,
    shopping_mall_seller_id: admin.id,
    quantity: 2 as number & tags.Type<"int32">,
    unit_price: 10000,
    final_price: 10000,
    status: "ordered",
  } satisfies IShoppingMallOrderItem.ICreate;
  const addedItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.create(connection, {
      orderId: order.id,
      body: addItemInput,
    });
  typia.assert(addedItem);
  TestValidator.equals(
    "added item is linked to order",
    addedItem.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "added item is linked to product",
    addedItem.shopping_mall_product_id,
    product.id,
  );

  // 9. Error case: Add item to non-existent order
  await TestValidator.error(
    "adding item to non-existent order should fail",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.create(connection, {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        body: addItemInput,
      });
    },
  );

  // 10. Error case: Insufficient privilege (simulate by using unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "adding item without authentication should fail",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.create(unauthConn, {
        orderId: order.id,
        body: addItemInput,
      });
    },
  );

  // 11. Error case: Missing product reference
  const badAddItem = {
    ...addItemInput,
    shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallOrderItem.ICreate;
  await TestValidator.error(
    "adding item with invalid product reference should fail",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.create(connection, {
        orderId: order.id,
        body: badAddItem,
      });
    },
  );
}
