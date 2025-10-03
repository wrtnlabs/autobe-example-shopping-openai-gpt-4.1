import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
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
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate advanced admin review search and moderation.
 *
 * Tests cover: admin registration, creation of all entities (channel, section,
 * category, product), customer join, cart, order, review submission, and
 * finally the admin's ability to search/filter/paginate all reviews. Edge
 * cases: filter by status, by reviewer, by product, by rating boundaries,
 * paging, and ensure restricted/pending reviews are accessible to admin.
 */
export async function test_api_admin_review_advanced_search_and_moderation(
  connection: api.IConnection,
) {
  // 1. Register admin and authenticate
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@admin.com`,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);

  // 2. Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IShoppingMallChannel.ICreate,
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
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallSection.ICreate,
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
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
          parent_id: null,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Register a product
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(), // (No seller join endpoint; using random uuid)
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        status: "Active",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Register customer
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: `${RandomGenerator.alphabets(8)}@shopper.com`,
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);

  // 7. Create cart for customer
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerAuth.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // 8. Place an order via admin endpoint
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerAuth.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cart.id,
        external_order_ref: RandomGenerator.alphaNumeric(10),
        order_type: "normal",
        total_amount: 50000,
        currency: "KRW",
        order_items: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_product_id: product.id,
            shopping_mall_seller_id: product.shopping_mall_seller_id,
            quantity: 1,
            unit_price: 50000,
            final_price: 50000,
            status: "ordered",
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
        deliveries: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            recipient_name: RandomGenerator.name(),
            recipient_phone: RandomGenerator.mobile(),
            address_snapshot: "Seoul, Korea",
            delivery_status: "prepared",
            delivery_attempts: 0,
          } satisfies IShoppingMallDelivery.ICreate,
        ],
        payments: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_customer_id: customerAuth.id,
            payment_type: "card",
            status: "paid",
            amount: 50000,
            currency: "KRW",
            requested_at: new Date().toISOString(),
          } satisfies IShoppingMallPayment.ICreate,
        ],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 9. Submit a review as customer
  const review = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order.id,
        rating: 5,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);

  // 10. As admin, search all reviews, paging, filtering, status-specific, etc
  // a) All reviews (no filter, default pagination)
  const page1 = await api.functional.shoppingMall.admin.reviews.index(
    connection,
    {
      body: {} satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.predicate(
    "contains created review",
    page1.data.some((r) => r.id === review.id),
  );

  // b) Filter by product
  const pageByProduct = await api.functional.shoppingMall.admin.reviews.index(
    connection,
    {
      body: { product_id: product.id } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(pageByProduct);
  TestValidator.predicate(
    "reviews by product filtered correctly",
    pageByProduct.data.every((r) => r.shopping_mall_product_id === product.id),
  );

  // c) Filter by customer
  const pageByCustomer = await api.functional.shoppingMall.admin.reviews.index(
    connection,
    {
      body: {
        customer_id: customerAuth.id,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(pageByCustomer);
  TestValidator.predicate(
    "reviews by customer filtered correctly",
    pageByCustomer.data.every(
      (r) => r.shopping_mall_customer_id === customerAuth.id,
    ),
  );

  // d) Filter by rating
  const pageByRating = await api.functional.shoppingMall.admin.reviews.index(
    connection,
    {
      body: {
        rating_min: 5,
        rating_max: 5,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(pageByRating);
  TestValidator.predicate(
    "reviews rating filtered correctly",
    pageByRating.data.every((r) => r.rating === 5),
  );

  // e) Filter by moderation status ('pending', 'approved', etc)
  if (review.moderation_status) {
    const pageByStatus = await api.functional.shoppingMall.admin.reviews.index(
      connection,
      {
        body: {
          status: review.moderation_status,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
    typia.assert(pageByStatus);
    TestValidator.predicate(
      "status filtered includes review",
      pageByStatus.data.some((r) => r.id === review.id),
    );
  }

  // f) Pagination (use page/limit)
  const paged = await api.functional.shoppingMall.admin.reviews.index(
    connection,
    {
      body: { page: 1, limit: 1 } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(paged);
  TestValidator.equals("pagination respects limit", paged.data.length, 1);
}
