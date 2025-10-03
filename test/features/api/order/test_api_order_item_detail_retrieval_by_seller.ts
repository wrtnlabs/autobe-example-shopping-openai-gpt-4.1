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
 * Test that a seller can retrieve the details for a specific order item in an
 * order they are authorized for, and that unauthorized sellers are denied
 * access. Workflow:
 *
 * 1. Register a channel, section, and category as admin.
 * 2. Register a seller (authorized) for the created channel/section.
 * 3. Register a product as that seller for the channel/section/category.
 * 4. Register a customer in the channel, and create a cart for them.
 * 5. Create an order as admin for that customer (with empty items, payment, and
 *    delivery for simplicity), referencing the cart and needed
 *    channel/section.
 * 6. Add an order item via admin, pointing to the registered product, order, and
 *    seller, and specifying quantity/pricing.
 * 7. Log back in as the seller and retrieve the order item detail via the seller
 *    endpoint.
 * 8. Validate that the fields match product, seller, and pricing as used in
 *    creation, and standard audit fields are present.
 * 9. Switch to a different (unauthorized) seller account and verify that
 *    retrieving the order item fails.
 * 10. Validate soft-deletion compliance by ensuring no deleted items are included
 *     (if possible).
 */
export async function test_api_order_item_detail_retrieval_by_seller(
  connection: api.IConnection,
) {
  // 1. Register channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      },
    },
  );
  typia.assert(channel);

  // 2. Register section
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 0,
        },
      },
    );
  typia.assert(section);

  // 3. Register category
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(7),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        },
      },
    );
  typia.assert(category);

  // 4. Register authorized seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "1234",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(1),
      kyc_status: "pending",
    },
  });
  typia.assert(seller);

  // 5. Register product as seller
  const productCode = RandomGenerator.alphaNumeric(10);
  const productName = RandomGenerator.name(2);
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: productCode,
        name: productName,
        status: "Active",
        business_status: "Approval",
      },
    },
  );
  typia.assert(product);

  // 6. Register a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      password: "abcd1234",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);

  // 7. Create a cart as the customer
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

  // 8. Create an empty order as admin for the customer
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cart.id,
        external_order_ref: null,
        order_type: "normal",
        total_amount: 0,
        currency: "KRW",
        order_items: [],
        deliveries: [],
        payments: [],
        after_sale_services: [],
      },
    },
  );
  typia.assert(order);

  // 9. Add an order item for this order
  const unitPrice = 10000;
  const orderItem = await api.functional.shoppingMall.admin.orders.items.create(
    connection,
    {
      orderId: order.id,
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_product_id: product.id,
        shopping_mall_seller_id: seller.id,
        shopping_mall_product_variant_id: undefined,
        quantity: 2,
        unit_price: unitPrice,
        final_price: unitPrice,
        discount_snapshot: null,
        status: "ordered",
      },
    },
  );
  typia.assert(orderItem);

  // 10. Log-in again as seller (simulate real usage; in this SDK join/registration also logs in)

  // 11. Seller tries to fetch the order item detail
  const read = await api.functional.shoppingMall.seller.orders.items.at(
    connection,
    {
      orderId: order.id,
      itemId: orderItem.id,
    },
  );
  typia.assert(read);

  // 12. Validate fetched fields
  TestValidator.equals("order item id", read.id, orderItem.id);
  TestValidator.equals("order id", read.shopping_mall_order_id, order.id);
  TestValidator.equals("product id", read.shopping_mall_product_id, product.id);
  TestValidator.equals("seller id", read.shopping_mall_seller_id, seller.id);
  TestValidator.equals("quantity", read.quantity, 2);
  TestValidator.equals("unit price", read.unit_price, unitPrice);
  TestValidator.equals("final price", read.final_price, unitPrice);
  TestValidator.equals("status", read.status, "ordered");
  TestValidator.predicate(
    "created_at is present",
    typeof read.created_at === "string" && !!read.created_at,
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof read.updated_at === "string" && !!read.updated_at,
  );

  // 13. Register another, unauthorized seller for the channel/section
  const badSellerEmail = typia.random<string & tags.Format<"email">>();
  const badSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: badSellerEmail,
      password: "12121212",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(1),
      kyc_status: "pending",
    },
  });
  typia.assert(badSeller);

  // 14. Try to access the order item as unauthorized seller
  await TestValidator.error(
    "unauthorized seller cannot view order item detail",
    async () => {
      await api.functional.shoppingMall.seller.orders.items.at(connection, {
        orderId: order.id,
        itemId: orderItem.id,
      });
    },
  );

  // 15. Ensure we are not able to access soft-deleted order items (negative check not directly possible in direct item get, but if deleted_at field is present, check compliance)
  TestValidator.equals("order item not soft deleted", read.deleted_at, null);
}
