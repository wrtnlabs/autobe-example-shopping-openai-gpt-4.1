import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
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
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate access control enforcing order item visibility is restricted to the
 * owning customer.
 *
 * This e2e test covers two customers creating their own orders on a newly
 * created channel/section/category/product.
 *
 * - Setup:
 *
 *   1. Create a channel (admin)
 *   2. Create a section under that channel (admin)
 *   3. Create a category under that channel (admin)
 *   4. Register a product (seller) for the above channel/section/category
 *   5. Register customer A
 *   6. Customer A creates a cart, then an order with the product, with minimal
 *        delivery/payment
 *   7. Register customer B
 *   8. Customer B creates a cart, then an order with the product, with minimal
 *        delivery/payment
 * - Validation:
 *
 *   1. Customer A successfully lists their own order items
 *   2. Customer B attempts to list order items for customer A's order, expecting
 *        authorization error (TestValidator.error). This must not be a type
 *        error but a proper business logic error. No HTTP status code
 *        assumptions, focus purely on error occurrence.
 *   3. Schemas for DTO usage are strictly limited to those provided. No DTO property
 *        guessing or cross-reference with unrelated sample code. Only required
 *        DTO fields from the material may be used for each creation step.
 *   4. No audit API exists in DTO/APIs, so we do not check for persistence of denied
 *        attempts, only functional error surface.
 */
export async function test_api_order_items_list_for_customer_with_unauthorized_access_denied(
  connection: api.IConnection,
) {
  // 1. Create channel (admin)
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // 2. Create section (admin)
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 3. Create category (admin)
  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Register a product (seller) -- since no seller API, treat as generic assignment
  const sellerId: string = typia.random<string & tags.Format<"uuid">>();
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: sellerId,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        status: "active",
        business_status: "active",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 5. Register customer A
  const customerAEmail = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: channel.id,
        email: customerAEmail as string & tags.Format<"email">,
        password: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customerA);

  // 6. Customer A creates cart
  const cartA: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        shopping_mall_customer_id: customerA.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cartA);

  // 6b. Customer A order creation
  const orderItemAInput: IShoppingMallOrderItem.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // will be set by the order
    shopping_mall_product_id: product.id,
    shopping_mall_seller_id: sellerId,
    quantity: 1,
    unit_price: 1000,
    final_price: 1000,
    status: "ordered",
  };
  const deliveryAInput: IShoppingMallDelivery.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // will be set by the order
    recipient_name: customerA.name,
    recipient_phone:
      typeof customerA.phone === "string"
        ? customerA.phone
        : RandomGenerator.mobile(),
    delivery_status: "prepared",
    delivery_attempts: 0,
  };
  const paymentAInput: IShoppingMallPayment.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // will be set by the order
    shopping_mall_customer_id: customerA.id,
    payment_type: "card",
    status: "paid",
    amount: 1000,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  };
  const orderA: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customerA.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cartA.id,
        order_type: "normal",
        total_amount: 1000,
        currency: "KRW",
        order_items: [orderItemAInput],
        deliveries: [deliveryAInput],
        payments: [paymentAInput],
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(orderA);

  // 7. Register customer B
  const customerBEmail = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: channel.id,
        email: customerBEmail as string & tags.Format<"email">,
        password: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customerB);

  // 8. Customer B creates cart
  const cartB: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        shopping_mall_customer_id: customerB.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cartB);

  // 8b. Customer B order creation
  const orderItemBInput: IShoppingMallOrderItem.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_id: product.id,
    shopping_mall_seller_id: sellerId,
    quantity: 1,
    unit_price: 1000,
    final_price: 1000,
    status: "ordered",
  };
  const deliveryBInput: IShoppingMallDelivery.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    recipient_name: customerB.name,
    recipient_phone:
      typeof customerB.phone === "string"
        ? customerB.phone
        : RandomGenerator.mobile(),
    delivery_status: "prepared",
    delivery_attempts: 0,
  };
  const paymentBInput: IShoppingMallPayment.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_customer_id: customerB.id,
    payment_type: "card",
    status: "paid",
    amount: 1000,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  };
  const orderB: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customerB.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cartB.id,
        order_type: "normal",
        total_amount: 1000,
        currency: "KRW",
        order_items: [orderItemBInput],
        deliveries: [deliveryBInput],
        payments: [paymentBInput],
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(orderB);

  // --- Validation ---
  // 1. Customer A lists own order items
  {
    // customer A is already authenticated in connection
    const resA: IPageIShoppingMallOrderItem =
      await api.functional.shoppingMall.customer.orders.items.index(
        connection,
        {
          orderId: orderA.id,
          body: {},
        },
      );
    typia.assert(resA);
    TestValidator.predicate(
      "customer A order items are present",
      resA.data.length > 0,
    );
  }

  // 2. Customer B attempts to list Customer A's order items (should be denied).
  // Switch connection context to customer B by calling join again (SDK manages authentication token automatically)
  await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerBEmail as string & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(10),
      name: customerB.name,
      phone:
        typeof customerB.phone === "string"
          ? customerB.phone
          : RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });

  await TestValidator.error(
    "unauthorized user cannot list another customer's order items",
    async () => {
      await api.functional.shoppingMall.customer.orders.items.index(
        connection,
        {
          orderId: orderA.id,
          body: {},
        },
      );
    },
  );
}
