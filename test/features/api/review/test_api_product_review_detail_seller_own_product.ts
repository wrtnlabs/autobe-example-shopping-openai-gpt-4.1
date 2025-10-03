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
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate that a seller can retrieve the detailed product review for their own
 * product.
 *
 * 1. Admin creates a channel.
 * 2. Admin creates a section in that channel.
 * 3. Admin creates a category in that channel.
 * 4. Seller joins, specifying the new channel & section.
 * 5. Customer joins, specifying the channel.
 * 6. Seller registers a product in the created channel/section/category.
 * 7. Customer creates a cart for the product (shopping cart for purchase flow).
 * 8. Admin places an order for the customer for the registered product via cart.
 * 9. Customer writes a review for the product in that order.
 * 10. Seller retrieves the review using their own access privilege.
 *
 * Validate:
 *
 * - Review is accessible by the seller.
 * - Review detail is correct and corresponds to the established business
 *   relationships: seller, product, order, customer.
 * - All major foreign key relationships align: product, order, reviewer
 *   (customer).
 */
export async function test_api_product_review_detail_seller_own_product(
  connection: api.IConnection,
) {
  // Channel creation by admin
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Section creation
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // Category creation
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // Seller registration (note: seller must be assigned to the section)
  const sellerEmail = `${RandomGenerator.alphabets(8)}@seller.com`;
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "password123",
      name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(1),
      kyc_status: "verified",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Customer registration
  const customerEmail = `${RandomGenerator.alphabets(8)}@customer.com`;
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      password: "password123",
      name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // Seller registers product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphabets(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "Active",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Customer creates cart
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

  // Admin places order for customer (using cart and product IDs, minimal required fields for one product order)
  const unit_price = 10000;
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: unit_price,
        currency: "KRW",
        order_items: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_product_id: product.id,
            shopping_mall_product_variant_id: null,
            shopping_mall_seller_id: seller.id,
            quantity: 1,
            unit_price,
            final_price: unit_price,
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
            recipient_name: RandomGenerator.name(2),
            recipient_phone: RandomGenerator.mobile(),
            address_snapshot: RandomGenerator.paragraph({ sentences: 4 }),
            delivery_message: RandomGenerator.paragraph({ sentences: 2 }),
            delivery_status: "prepared",
            delivery_attempts: 1,
          } satisfies IShoppingMallDelivery.ICreate,
        ],
        payments: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_customer_id: customer.id,
            payment_type: "card",
            external_payment_ref: null,
            status: "paid",
            amount: unit_price,
            currency: "KRW",
            requested_at: new Date().toISOString(),
          } satisfies IShoppingMallPayment.ICreate,
        ],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Customer writes review (links to product & order)
  const review = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order.id,
        rating: 5,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);

  // Seller retrieves review detail by reviewId
  // (seller owns product associated with review; this should be allowed)
  const reviewDetail = await api.functional.shoppingMall.seller.reviews.at(
    connection,
    {
      reviewId: review.id,
    },
  );
  typia.assert(reviewDetail);

  // Validation - review fetched should match product, order, and reviewer
  TestValidator.equals(
    "review.product_id matches the registered product",
    reviewDetail.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "review.order_id matches the order",
    reviewDetail.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "review.customer_id matches the reviewer customer",
    reviewDetail.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.predicate(
    "seller can access review for their own product",
    reviewDetail.shopping_mall_product_id === product.id,
  );
}
