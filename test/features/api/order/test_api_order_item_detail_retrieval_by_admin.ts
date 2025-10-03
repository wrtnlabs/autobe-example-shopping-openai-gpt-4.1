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
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate that an admin can retrieve the complete detail for an order item,
 * including all product, pricing, audit, and fulfillment fields required for
 * compliance and evidence.
 *
 * 1. Register a new admin with unique credentials.
 * 2. Create a shopping mall channel as admin.
 * 3. Create a section within the newly created channel.
 * 4. Create a category for the channel.
 * 5. Register a new product as admin (linked to created channel/section/category).
 * 6. Register a new customer (with email, name, phone for test clarity).
 * 7. Create a shopping cart for the customer in the created channel/section.
 * 8. As admin, create a new order for the customer with required references.
 *    Compose initial order_items, deliveries, and payments arrays using
 *    realistic data and pricing.
 * 9. Add an additional item to the order as admin.
 * 10. Retrieve the detail for one order item as the admin.
 * 11. Assert that all schema-required fields are present and correct, especially
 *     for compliance and audit.
 * 12. Attempt retrieval of a non-existent (random) order item, expecting failure.
 */
export async function test_api_order_item_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(2),
      },
    });
  typia.assert(admin);

  // 2. Create a channel
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    });
  typia.assert(channel);

  // 3. Create a section for the channel
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        },
      },
    );
  typia.assert(section);

  // 4. Create a category for the channel
  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        },
      },
    );
  typia.assert(category);

  // 5. Register a product as admin
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: admin.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        status: "Active",
        business_status: "Approval",
      },
    });
  typia.assert(product);

  // 6. Register a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: channel.id,
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(11),
        name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
      },
    });
  typia.assert(customer);

  // 7. Create a cart for the customer
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      },
    });
  typia.assert(cart);

  // 8. Admin creates a new order for the customer (with one order item, one delivery, one payment)
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cart.id,
        external_order_ref: null,
        order_type: "normal",
        total_amount: 12500,
        currency: "KRW",
        order_items: [
          {
            shopping_mall_order_id: "to-be-filled", // will be replaced below
            shopping_mall_product_id: product.id,
            shopping_mall_product_variant_id: null,
            shopping_mall_seller_id: admin.id,
            quantity: 1,
            unit_price: 12500,
            final_price: 12500,
            discount_snapshot: null,
            status: "ordered",
          },
        ],
        deliveries: [
          {
            shopping_mall_order_id: "to-be-filled",
            shopping_mall_shipment_id: undefined,
            recipient_name: customer.name,
            recipient_phone: customer.phone ?? RandomGenerator.mobile(),
            address_snapshot: RandomGenerator.paragraph({ sentences: 3 }),
            delivery_message: undefined,
            delivery_status: "prepared",
            delivery_attempts: 0,
          },
        ],
        payments: [
          {
            shopping_mall_order_id: "to-be-filled",
            shopping_mall_customer_id: customer.id,
            payment_type: "card",
            external_payment_ref: null,
            status: "pending",
            amount: 12500,
            currency: "KRW",
            requested_at: new Date().toISOString(),
          },
        ],
        after_sale_services: undefined,
      },
    });
  typia.assert(order);

  // 9. Add another order item as admin
  const extraOrderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.create(connection, {
      orderId: order.id,
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_product_id: product.id,
        shopping_mall_product_variant_id: null,
        shopping_mall_seller_id: admin.id,
        quantity: 2,
        unit_price: 12500,
        final_price: 12500,
        discount_snapshot: null,
        status: "ordered",
      },
    });
  typia.assert(extraOrderItem);

  // 10. Retrieve the detail for the just-created order item
  const detail: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.at(connection, {
      orderId: order.id,
      itemId: extraOrderItem.id,
    });
  typia.assert(detail);
  TestValidator.equals(
    "retrieved order item matches added",
    detail,
    extraOrderItem,
  );

  // 11. Attempt to retrieve a non-existent order item (should fail)
  await TestValidator.error(
    "retrieving non-existent order item fails",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.at(connection, {
        orderId: order.id,
        itemId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
