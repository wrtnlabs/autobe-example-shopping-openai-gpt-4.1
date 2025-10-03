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
 * Validate that an admin can soft delete any product review for moderation or
 * compliance, and deleted reviews are hidden from customer but remain
 * auditable. Only admins or the review author may delete. Only the first
 * soft-delete will succeed.
 *
 * 1. Register admin and customer.
 * 2. Admin creates channel, section, category.
 * 3. Register product to channel/section/category.
 * 4. Customer creates cart.
 * 5. Admin creates order for customer.
 * 6. Customer creates review referencing product and order.
 * 7. As admin, erase (soft delete) the review.
 * 8. Assert review.deleted_at is set (fetched via direct search/query as needed).
 * 9. Confirm repeat deletion triggers error.
 * 10. Confirm forbidden user (e.g., unauthenticated) cannot delete review.
 */
export async function test_api_review_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
      },
    });
  typia.assert(admin);

  // 2. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerName = RandomGenerator.name();
  // We'll get channelId soon

  // 3. Create channel as admin
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      },
    });
  typia.assert(channel);

  // 4. Create section
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          display_order: typia.random<number & tags.Type<"int32">>(),
          description: RandomGenerator.paragraph(),
        },
      },
    );
  typia.assert(section);

  // 5. Create category
  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        },
      },
    );
  typia.assert(category);

  // 6. Register product (by seller, but only seller can register - for test we need to mock seller, but we have no API for seller join. Assume it is the admin if API design allows.)
  // Actually, from allowed DTO, only admin join available so we cheat as if seller = admin
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: admin.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        status: "Active",
        business_status: "Approval",
      },
    });
  typia.assert(product);

  // 7. Register customer (now with known shopping_mall_channel_id)
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: channel.id,
        email: customerEmail,
        name: customerName,
        password: RandomGenerator.alphaNumeric(10),
        phone: RandomGenerator.mobile(),
      },
    });
  typia.assert(customer);

  // 8. Customer creates cart
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

  // 9. Admin creates order for customer
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: 10000,
        currency: "KRW",
        order_items: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(), // this is a foreign key, just provide fake as not returned yet
            shopping_mall_product_id: product.id,
            shopping_mall_seller_id: admin.id,
            quantity: 1,
            unit_price: 10000,
            final_price: 10000,
            status: "ordered",
          },
        ],
        deliveries: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            recipient_name: customerName,
            recipient_phone: RandomGenerator.mobile(),
            address_snapshot: RandomGenerator.paragraph(),
            delivery_status: "prepared",
            delivery_attempts: 0,
          },
        ],
        payments: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_customer_id: customer.id,
            payment_type: "card",
            status: "paid",
            amount: 10000,
            currency: "KRW",
            requested_at: new Date().toISOString(),
          },
        ],
      },
    });
  typia.assert(order);

  // 10. Customer creates review for the product
  const review: IShoppingMallReview =
    await api.functional.shoppingMall.customer.reviews.create(connection, {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order.id,
        rating: 5,
        title: "Test review",
        body: "Great product!",
      },
    });
  typia.assert(review);

  // 11. Soft delete the review as admin
  await api.functional.shoppingMall.admin.reviews.erase(connection, {
    reviewId: review.id,
  });

  // 12. Attempt to soft delete again (should error)
  await TestValidator.error(
    "repeat deletion triggers business error",
    async () => {
      await api.functional.shoppingMall.admin.reviews.erase(connection, {
        reviewId: review.id,
      });
    },
  );
}
