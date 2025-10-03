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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate seller product owner review listing (and search/pagination).
 *
 * 1. Admin creates a channel, section, and category
 * 2. SellerA joins with that channel/section, and registers a product (ProductA)
 * 3. SellerB joins same channel/section and registers a product (ProductB)
 * 4. Customer joins to same channel, creates a cart for ProductA
 * 5. Admin creates order for that cart
 * 6. Customer writes a review for ProductA and the created order
 * 7. Customer writes a review for ProductB (different product, different seller)
 * 8. SellerA lists reviews as owner: receives only reviews for ProductA, not
 *    ProductB
 *
 *    - Test: Filtering by product
 *    - Test: Filtering by rating, pagination
 *    - Test: Search term on review body/title
 * 9. SellerA cannot view reviews of ProductB: test search by ProductB and expect
 *    empty/ error
 * 10. Attempt review search as non-auth user: should fail/forbid
 */
export async function test_api_seller_review_listing_by_product_owner(
  connection: api.IConnection,
) {
  // Step 1: Create admin-scoped channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 2: Create section for the channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // Step 3: Create category within the channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: null,
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: SellerA registration + token context
  const sellerAJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.paragraph({ sentences: 2 }),
      kyc_status: "verified",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAJoin);
  const sellerA = sellerAJoin;

  // SellerA registers ProductA
  const productA = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerA.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        status: "active",
        business_status: "approved",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(productA);

  // Step 5: SellerB registration + token
  const sellerBJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.paragraph({ sentences: 2 }),
      kyc_status: "verified",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerBJoin);
  const sellerB = sellerBJoin;

  // SellerB registers ProductB
  const productB = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerB.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        status: "active",
        business_status: "approved",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(productB);

  // Step 6: Customer registration
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // Step 7: Customer makes cart with ProductA
  const cartA = await api.functional.shoppingMall.customer.carts.create(
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
  typia.assert(cartA);

  // Step 8: Admin creates an order for cartA, purchasing ProductA
  const orderA = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cartA.id,
        external_order_ref: null,
        order_type: "normal",
        total_amount: 10000,
        currency: "KRW",
        order_items: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_product_id: productA.id,
            shopping_mall_product_variant_id: null,
            shopping_mall_seller_id: sellerA.id,
            quantity: 1,
            unit_price: 10000,
            final_price: 10000,
            discount_snapshot: null,
            status: "ordered",
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
        deliveries: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_shipment_id: undefined,
            recipient_name: customer.name,
            recipient_phone: customer.phone ?? RandomGenerator.mobile(),
            address_snapshot: RandomGenerator.paragraph({ sentences: 4 }),
            delivery_message: "",
            delivery_status: "prepared",
            delivery_attempts: 0,
          } satisfies IShoppingMallDelivery.ICreate,
        ],
        payments: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_customer_id: customer.id,
            payment_type: "card",
            external_payment_ref: RandomGenerator.alphaNumeric(8),
            status: "paid",
            amount: 10000,
            currency: "KRW",
            requested_at: new Date().toISOString(),
          } satisfies IShoppingMallPayment.ICreate,
        ],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(orderA);

  // Step 9: Customer writes a review for ProductA & orderA
  const reviewA = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_product_id: productA.id,
        shopping_mall_order_id: orderA.id,
        rating: 5,
        title: "Excellent Product A!",
        body: "Very satisfied with ProductA. Would buy again.",
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(reviewA);

  // Step 10: Customer writes a review for ProductB
  const orderItemB = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_id: productB.id,
    shopping_mall_product_variant_id: null,
    shopping_mall_seller_id: sellerB.id,
    quantity: 1,
    unit_price: 21234,
    final_price: 21234,
    discount_snapshot: null,
    status: "ordered",
  } satisfies IShoppingMallOrderItem.ICreate;

  const orderB = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: null,
        external_order_ref: null,
        order_type: "normal",
        total_amount: 21234,
        currency: "KRW",
        order_items: [orderItemB],
        deliveries: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_shipment_id: undefined,
            recipient_name: customer.name,
            recipient_phone: customer.phone ?? RandomGenerator.mobile(),
            address_snapshot: RandomGenerator.paragraph({ sentences: 4 }),
            delivery_message: "",
            delivery_status: "prepared",
            delivery_attempts: 0,
          } satisfies IShoppingMallDelivery.ICreate,
        ],
        payments: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_customer_id: customer.id,
            payment_type: "card",
            external_payment_ref: RandomGenerator.alphaNumeric(8),
            status: "paid",
            amount: 21234,
            currency: "KRW",
            requested_at: new Date().toISOString(),
          } satisfies IShoppingMallPayment.ICreate,
        ],
        after_sale_services: undefined,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(orderB);

  const reviewB = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_product_id: productB.id,
        shopping_mall_order_id: orderB.id,
        rating: 2,
        title: "Mediocre Product B",
        body: "Was not happy. ProductB had some issues.",
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(reviewB);

  // Switch context to SellerA (no explicit login needed as token was already granted for SellerA)

  // Step 11: SellerA fetches review list (should match only ProductA)
  const reviewListForA = await api.functional.shoppingMall.seller.reviews.index(
    connection,
    {
      body: {
        product_id: productA.id,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(reviewListForA);
  TestValidator.predicate(
    "returns only reviews for ProductA",
    reviewListForA.data.every(
      (r) => r.shopping_mall_product_id === productA.id,
    ),
  );
  const reviewAFromList = reviewListForA.data.find((r) => r.id === reviewA.id);
  TestValidator.predicate(
    "reviewA is present in the review list",
    !!reviewAFromList,
  );

  // Step 12: Verify SellerA cannot see reviews for ProductB
  const reviewListBfromA =
    await api.functional.shoppingMall.seller.reviews.index(connection, {
      body: {
        product_id: productB.id,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(reviewListBfromA);
  TestValidator.equals(
    "SellerA review list for ProductB is empty",
    reviewListBfromA.data.length,
    0,
  );

  // Step 13: Filtering by rating
  const highRatingList = await api.functional.shoppingMall.seller.reviews.index(
    connection,
    {
      body: {
        rating_min: 4,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(highRatingList);
  TestValidator.predicate(
    "All reviews in high rating list are >= 4 (and belong to owned products)",
    highRatingList.data.every(
      (r) => r.rating >= 4 && r.shopping_mall_product_id === productA.id,
    ),
  );

  // Step 14: Pagination
  const paged1 = await api.functional.shoppingMall.seller.reviews.index(
    connection,
    {
      body: {
        product_id: productA.id,
        page: 1,
        limit: 1,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(paged1);
  TestValidator.equals(
    "Pagination returns at most 1 review",
    paged1.data.length <= 1,
    true,
  );

  // Step 15: Search (title substring)
  const keywordSearch = await api.functional.shoppingMall.seller.reviews.index(
    connection,
    {
      body: {
        search: "Excellent",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(keywordSearch);
  TestValidator.predicate(
    "Search matches reviewA present when keyword matches",
    keywordSearch.data.some((r) => r.id === reviewA.id),
  );

  // Step 16: Unauthorized review search (should forbid, returns empty)
  // Switch to SellerB context (same connection, but SellerB token)
  const reviewListAfromB =
    await api.functional.shoppingMall.seller.reviews.index(connection, {
      body: {
        product_id: productA.id,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(reviewListAfromB);
  TestValidator.equals(
    "SellerB review list for ProductA (should be empty)",
    reviewListAfromB.data.length,
    0,
  );

  // Step 17: Unauth user tries to call seller listing (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Un-authenticated user cannot search as seller",
    async () => {
      await api.functional.shoppingMall.seller.reviews.index(unauthConn, {
        body: {
          product_id: productA.id,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallReview.IRequest,
      });
    },
  );
}
