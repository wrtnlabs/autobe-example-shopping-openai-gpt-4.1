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
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Verify that an admin can update any product review, regardless of the
 * original author, and that all changes are properly snapshotted and
 * moderateable.
 */
export async function test_api_review_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminpass123",
      name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);

  // 2. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: "", // will set after channel creation
      email: customerEmail,
      password: "customer123",
      name: RandomGenerator.name(),
    },
  });
  typia.assert(customer);
  // We'll re-run auth.customer.join after channel creation with correct channel id

  // 3. Create channel as admin
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      },
    },
  );
  typia.assert(channel);

  // 3b. (Re-)register customer to correct channel_id
  const customer2 = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      password: "customer123",
      name: RandomGenerator.name(),
    },
  });
  typia.assert(customer2);

  // 4. Create section as admin
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.name(),
          display_order: 1,
        },
      },
    );
  typia.assert(section);

  // 5. Create category as admin
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.name(),
          display_order: 1,
        },
      },
    );
  typia.assert(category);

  // 6. Register product as seller (admin creates as seller for test)
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerId,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphabets(12),
        name: RandomGenerator.name(),
        status: "active",
        business_status: "approval",
      },
    },
  );
  typia.assert(product);

  // 7. Create cart as customer
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer2.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      },
    },
  );
  typia.assert(cart);

  // 8. Create order as admin (forcing a verified purchase)
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer2.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: 10000,
        currency: "USD",
        order_items: [
          {
            shopping_mall_order_id: "",
            shopping_mall_product_id: product.id,
            shopping_mall_seller_id: sellerId,
            quantity: 1,
            unit_price: 10000,
            final_price: 10000,
            status: "ordered",
          },
        ],
        deliveries: [
          {
            shopping_mall_order_id: "",
            recipient_name: RandomGenerator.name(),
            recipient_phone: RandomGenerator.mobile(),
            address_snapshot: RandomGenerator.paragraph(),
            delivery_status: "prepared",
            delivery_attempts: 1,
          },
        ],
        payments: [
          {
            shopping_mall_order_id: "",
            shopping_mall_customer_id: customer2.id,
            payment_type: "card",
            status: "paid",
            amount: 10000,
            currency: "USD",
            requested_at: new Date().toISOString(),
          },
        ],
      },
    },
  );
  typia.assert(order);

  // 9. Customer creates review on purchased product
  const review = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order.id,
        rating: 4,
        title: "Initial Review Title",
        body: "Initial review body.",
      },
    },
  );
  typia.assert(review);
  TestValidator.equals(
    "initial review product id matches",
    review.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "initial review order id matches",
    review.shopping_mall_order_id,
    order.id,
  );

  // 10. Admin updates the review
  const updateInput = {
    rating: 5,
    title: "Updated Review Title",
    body: "Updated review body for admin moderation.",
    moderation_status: "approved",
    notified_at: new Date().toISOString(),
  } satisfies IShoppingMallReview.IUpdate;

  const updatedReview = await api.functional.shoppingMall.admin.reviews.update(
    connection,
    {
      reviewId: review.id,
      body: updateInput,
    },
  );
  typia.assert(updatedReview);

  // 11. Validate update: only allowed fields changed, moderation logic applies
  TestValidator.equals("review rating updated", updatedReview.rating, 5);
  TestValidator.equals(
    "review title updated",
    updatedReview.title,
    "Updated Review Title",
  );
  TestValidator.equals(
    "review body updated",
    updatedReview.body,
    "Updated review body for admin moderation.",
  );
  TestValidator.equals(
    "review moderation status updated",
    updatedReview.moderation_status,
    "approved",
  );
  TestValidator.equals(
    "review notified_at updated",
    updatedReview.notified_at,
    updateInput.notified_at,
  );

  // Confirm unchanged fields
  TestValidator.equals("review id unchanged", updatedReview.id, review.id);
  TestValidator.equals(
    "review product id unchanged",
    updatedReview.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "review order id unchanged",
    updatedReview.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "review customer id unchanged",
    updatedReview.shopping_mall_customer_id,
    customer2.id,
  );
}
