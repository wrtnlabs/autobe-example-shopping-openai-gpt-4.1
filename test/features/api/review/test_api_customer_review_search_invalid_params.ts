import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
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
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Test invalid search scenarios on customer review listing endpoint. Steps:
 *
 * 1. Register a customer
 * 2. Create a channel, section, and category
 * 3. Register a product (not purchased by this customer)
 * 4. Prepare a cart for the customer
 * 5. Create an unrelated order (to simulate no purchase)
 * 6. Create one review for search context
 *
 * Validate the following business rejections:
 *
 * - Filtering by a product not purchased by the customer
 * - Using an unsupported search parameter
 * - Attempt unauthorized search (customer_id different from requester)
 */
export async function test_api_customer_review_search_invalid_params(
  connection: api.IConnection,
) {
  // Register a shopping mall channel (admin)
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);
  // Register section in channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);
  // Register category in channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);
  // Register customer
  const email = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Create a product not purchased by current customer
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "Active",
        business_status: "approved",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Prepare cart for the customer
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
  // Admin creates an unrelated order (no linkage to this product for the test customer)
  const unrelatedProductId = typia.random<string & tags.Format<"uuid">>();
  const unrelatedOrder = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cart.id,
        external_order_ref: undefined,
        order_type: "normal",
        total_amount: 12345,
        currency: "KRW",
        order_items: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_product_id: unrelatedProductId,
            shopping_mall_seller_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            quantity: 1,
            unit_price: 12345,
            final_price: 12345,
            status: "ordered",
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
        deliveries: [],
        payments: [],
        after_sale_services: [],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(unrelatedOrder);
  // Create a valid review for search context
  const validReview = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: unrelatedOrder.id,
        rating: 5,
        title: "Great!",
        body: RandomGenerator.paragraph(),
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(validReview);
  // Filtering by a product not purchased by the customer (simulate by random product id)
  await TestValidator.error(
    "should reject searching by product not purchased",
    async () => {
      await api.functional.shoppingMall.customer.reviews.index(connection, {
        body: {
          product_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallReview.IRequest,
      });
    },
  );
  // Using an unsupported search parameter (set order_by to illegal value)
  await TestValidator.error(
    "should reject unsupported search parameter",
    async () => {
      await api.functional.shoppingMall.customer.reviews.index(connection, {
        body: {
          order_by: "illegal_field_name",
        } satisfies IShoppingMallReview.IRequest,
      });
    },
  );
  // Attempting to search with mismatched customer_id
  await TestValidator.error(
    "should reject search with customer_id different than requester",
    async () => {
      await api.functional.shoppingMall.customer.reviews.index(connection, {
        body: {
          customer_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallReview.IRequest,
      });
    },
  );
}
