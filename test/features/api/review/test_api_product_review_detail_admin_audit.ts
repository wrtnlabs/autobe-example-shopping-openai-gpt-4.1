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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate that an admin can retrieve detailed information of a product review
 * for moderation/audit, after end-to-end setup.
 *
 * 1. Register admin user (for review audit endpoint usage).
 * 2. Admin creates channel.
 * 3. Admin creates section for the channel.
 * 4. Admin creates category for the channel.
 * 5. Register seller user for the channel/section.
 * 6. Register customer user for the channel.
 * 7. Seller registers product (using seller's section/category/channel).
 * 8. Customer creates cart (for the product's channel/section).
 * 9. Admin places an order for the customer, referencing cart/product.
 * 10. Customer writes review for product/order.
 * 11. Admin retrieves review detail (should see moderation metadata, reviewer
 *     linkage, audit evidence fields).
 * 12. Assert returned review object contains all expected admin-accessible fields
 *     with correct relationships.
 */
export async function test_api_product_review_detail_admin_audit(
  connection: api.IConnection,
) {
  // 1. Register admin user
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Create channel (as admin)
  const channelBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelBody,
    });
  typia.assert(channel);

  // 3. Create section in the channel
  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.ICreate;
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      { channelId: channel.id, body: sectionBody },
    );
  typia.assert(section);

  // 4. Create category in the channel
  const categoryBody = {
    shopping_mall_channel_id: channel.id,
    parent_id: null,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      { channelId: channel.id, body: categoryBody },
    );
  typia.assert(category);

  // 5. Register seller user (requires channel and section IDs)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    profile_name: RandomGenerator.name(1),
    kyc_status: "pending",
  } satisfies IShoppingMallSeller.IJoin;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(seller);

  // 6. Register customer user (requires channel ID)
  const customerJoinBody = {
    shopping_mall_channel_id: channel.id,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 7. Seller registers a product
  const productBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(2),
    status: "Active",
    business_status: "Approved",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 8. Customer creates a shopping cart
  const cartBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    source: "member",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  // 9. Admin places an order for customer
  const orderItem: IShoppingMallOrderItem.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // Placeholder, will be overridden when the order is created in backend
    shopping_mall_product_id: product.id,
    shopping_mall_product_variant_id: undefined,
    shopping_mall_seller_id: seller.id,
    quantity: 1,
    unit_price: 10000,
    final_price: 9000,
    discount_snapshot: null,
    status: "ordered",
  };
  const delivery: IShoppingMallDelivery.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // Set by backend
    shopping_mall_shipment_id: undefined,
    recipient_name: customer.name,
    recipient_phone: customer.phone!,
    address_snapshot: RandomGenerator.paragraph({ sentences: 5 }),
    delivery_message: "Deliver quickly",
    delivery_status: "prepared",
    delivery_attempts: 0,
  };
  const payment: IShoppingMallPayment.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_customer_id: customer.id,
    payment_type: "card",
    external_payment_ref: null,
    status: "paid",
    amount: 9000,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  };
  const orderBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_cart_id: cart.id,
    external_order_ref: "EXT" + RandomGenerator.alphaNumeric(6),
    order_type: "normal",
    total_amount: 9000,
    currency: "KRW",
    order_items: [orderItem],
    deliveries: [delivery],
    payments: [payment],
    after_sale_services: [],
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 10. Customer writes review for the product/order
  const reviewBody = {
    shopping_mall_product_id: product.id,
    shopping_mall_order_id: order.id,
    rating: 5,
    title: "Good product!",
    body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallReview.ICreate;
  const review: IShoppingMallReview =
    await api.functional.shoppingMall.customer.reviews.create(connection, {
      body: reviewBody,
    });
  typia.assert(review);

  // 11. Admin retrieves review detail for audit/moderation
  const adminReview: IShoppingMallReview =
    await api.functional.shoppingMall.admin.reviews.at(connection, {
      reviewId: review.id,
    });
  typia.assert(adminReview);

  // 12. Business logic assertions on review
  TestValidator.equals("review id matches", adminReview.id, review.id);
  TestValidator.equals(
    "review product id matches",
    adminReview.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "review order id matches",
    adminReview.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "reviewer (customer) id matches",
    adminReview.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "review rating matches",
    adminReview.rating,
    reviewBody.rating,
  );
  TestValidator.equals(
    "review title matches",
    adminReview.title,
    reviewBody.title,
  );
  TestValidator.equals(
    "review body matches",
    adminReview.body,
    reviewBody.body,
  );
  TestValidator.equals(
    "review moderation status exists",
    typeof adminReview.moderation_status === "string",
    true,
  );
  TestValidator.equals(
    "review created_at exists",
    typeof adminReview.created_at === "string",
    true,
  );
  TestValidator.equals(
    "review updated_at exists",
    typeof adminReview.updated_at === "string",
    true,
  );
  TestValidator.equals(
    "review notified_at is valid/null",
    typeof adminReview.notified_at === "string" ||
      adminReview.notified_at === null ||
      adminReview.notified_at === undefined,
    true,
  );
  TestValidator.equals(
    "review deleted_at is valid/null",
    typeof adminReview.deleted_at === "string" ||
      adminReview.deleted_at === null ||
      adminReview.deleted_at === undefined,
    true,
  );
}
