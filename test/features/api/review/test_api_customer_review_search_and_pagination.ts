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
 * Test customer review search and pagination.
 *
 * 1. Admin creates a channel.
 * 2. Admin creates a section under the channel.
 * 3. Admin creates a category in the channel.
 * 4. Register as customer to get authorized session and customer id.
 * 5. Register a product as a seller in the channel/section/category.
 * 6. Create a cart for the customer in the respective channel/section.
 * 7. Place an order for the product as the customer.
 * 8. Leave a review for the purchased product (with order and product ids).
 * 9. Search/filter reviews (pagination, filter by product, customer, rating,
 *    status, creation time, search string) -- verify all are correct and
 *    customer only sees own reviews.
 * 10. Attempt to fetch reviews for another customer -- should not see results.
 * 11. Pagination and empty page/invalid search edge cases are handled gracefully
 *     (empty data array, no exceptions).
 */
export async function test_api_customer_review_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. Admin creates a channel
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);
  // 2. Admin adds section
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 0,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Admin creates a category
  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: undefined,
          code: RandomGenerator.alphaNumeric(7),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);
  // 4. Register as customer
  const email = typia.random<string & tags.Format<"email">>();
  const joinRes = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email,
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinRes);
  const customerId = joinRes.id;
  // 5. Register a product as seller (simulate by using admin context with random seller id)
  // For the test, just generate a random seller id -- it's not validated here
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: sellerId,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "Active",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);
  // 6. Create a cart for the customer
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        shopping_mall_customer_id: customerId,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cart);
  // 7. Create an order for the product as the customer (simulate payment, delivery, items)
  const orderItem1: IShoppingMallOrderItem.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // placeholder (will be set by backend),
    shopping_mall_product_id: product.id,
    shopping_mall_product_variant_id: undefined,
    shopping_mall_seller_id: sellerId,
    quantity: 1 as number & tags.Type<"int32">,
    unit_price: 30000,
    final_price: 30000,
    discount_snapshot: undefined,
    status: "ordered",
  };
  const delivery: IShoppingMallDelivery.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // placeholder,
    shopping_mall_shipment_id: undefined,
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph({ sentences: 4 }),
    delivery_message: undefined,
    delivery_status: "prepared",
    delivery_attempts: 1 as number & tags.Type<"int32">,
  };
  const payment: IShoppingMallPayment.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // placeholder,
    shopping_mall_customer_id: customerId,
    payment_type: "card",
    external_payment_ref: undefined,
    status: "paid",
    amount: 30000,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  };
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customerId,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cart.id,
        external_order_ref: undefined,
        order_type: "normal",
        total_amount: 30000,
        currency: "KRW",
        order_items: [orderItem1],
        deliveries: [delivery],
        payments: [payment],
        after_sale_services: [],
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);
  // 8. Leave a review for this purchased product
  const review: IShoppingMallReview =
    await api.functional.shoppingMall.customer.reviews.create(connection, {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order.id,
        rating: 5 as number & tags.Type<"int32">,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IShoppingMallReview.ICreate,
    });
  typia.assert(review);
  // 9. Search reviews as the customer (pagination, filter by product, customer, rating, etc.)
  // Should only get own review
  const searchBySelf: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.customer.reviews.index(connection, {
      body: {
        customer_id: customerId,
        limit: 10 as number & tags.Type<"int32">,
        page: 1 as number & tags.Type<"int32">,
        order_by: "created_at",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(searchBySelf);
  TestValidator.predicate(
    "customer can only see their own review",
    searchBySelf.data.length === 1 &&
      searchBySelf.data[0].id === review.id &&
      searchBySelf.data[0].shopping_mall_customer_id === customerId,
  );
  // 10. Try to search for reviews by another (random) customer id
  const randomCustomerId = typia.random<string & tags.Format<"uuid">>();
  const searchByRandom: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.customer.reviews.index(connection, {
      body: {
        customer_id: randomCustomerId,
        limit: 5 as number & tags.Type<"int32">,
        page: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(searchByRandom);
  TestValidator.equals(
    "search by another customer returns empty array",
    searchByRandom.data.length,
    0,
  );
  // 11. Test search by product id
  const searchByProduct: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.customer.reviews.index(connection, {
      body: {
        product_id: product.id,
        limit: 10 as number & tags.Type<"int32">,
        page: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(searchByProduct);
  TestValidator.predicate(
    "search by product includes our review",
    searchByProduct.data.some((d) => d.id === review.id),
  );
  // 12. Test search by minimum/max rating and status
  const searchByRating: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.customer.reviews.index(connection, {
      body: {
        rating_min: 5 as number & tags.Type<"int32">,
        rating_max: 5 as number & tags.Type<"int32">,
        page: 1 as number & tags.Type<"int32">,
        limit: 3 as number & tags.Type<"int32">,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(searchByRating);
  TestValidator.predicate(
    "review with rating 5 is found",
    searchByRating.data.some((d) => d.id === review.id),
  );
  // 13. Test paging (page 1 and out-of-bounds page)
  const paged1: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.customer.reviews.index(connection, {
      body: {
        customer_id: customerId,
        limit: 1 as number & tags.Type<"int32">,
        page: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(paged1);
  TestValidator.equals("paging works for page 1", paged1.data.length, 1);
  // Out-of-bounds page
  const paged100: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.customer.reviews.index(connection, {
      body: {
        customer_id: customerId,
        limit: 2 as number & tags.Type<"int32">,
        page: 100 as number & tags.Type<"int32">,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(paged100);
  TestValidator.equals(
    "out-of-bounds paging yields zero results",
    paged100.data.length,
    0,
  );
  // 14. Test search by status if available or by creation window
  const searchByWindow: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.customer.reviews.index(connection, {
      body: {
        created_from: review.created_at,
        created_to: review.created_at,
        page: 1 as number & tags.Type<"int32">,
        limit: 5 as number & tags.Type<"int32">,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(searchByWindow);
  TestValidator.predicate(
    "review found by creation date window",
    searchByWindow.data.some((d) => d.id === review.id),
  );
  // 15. Test free-text search (just use title as search string)
  if (review.title) {
    const searchByTitle: IPageIShoppingMallReview.ISummary =
      await api.functional.shoppingMall.customer.reviews.index(connection, {
        body: {
          search: review.title,
          page: 1 as number & tags.Type<"int32">,
          limit: 3 as number & tags.Type<"int32">,
        } satisfies IShoppingMallReview.IRequest,
      });
    typia.assert(searchByTitle);
    TestValidator.predicate(
      "search by text finds the review",
      searchByTitle.data.some((d) => d.id === review.id),
    );
  }
}
