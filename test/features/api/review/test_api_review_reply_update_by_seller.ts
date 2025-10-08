import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReply";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates that a seller can successfully update a reply to a customer's
 * product review. The flow covers:
 *
 * 1. Admin creates category and product.
 * 2. Seller registers, then a product is created under admin's flow on their
 *    behalf.
 * 3. Customer registers, creates address, and places order for product.
 * 4. Payment method is set up.
 * 5. Customer submits review for the product.
 * 6. Admin (on behalf of seller) creates an initial reply to the review.
 * 7. Seller updates the reply (changes body and status).
 * 8. Test asserts proper content, status change, and timestamp updates.
 */
export async function test_api_review_reply_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Admin registration (creates category & product later)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "Admin#Password123",
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const businessRegNumber = RandomGenerator.alphaNumeric(10);
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "Seller@Password123",
        business_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        kyc_document_uri: null,
        business_registration_number: businessRegNumber,
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // 3. Create product category (admin context)
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.name(2),
        name_en: RandomGenerator.name(2),
        description_ko: RandomGenerator.content({ paragraphs: 1 }),
        description_en: RandomGenerator.content({ paragraphs: 1 }),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 4. Create product as admin for the seller
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        is_active: true,
        main_image_url: null,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 5. Customer registration (for review)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "Customer@Password123",
        full_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(2),
          phone: RandomGenerator.mobile(),
          region: "Seoul",
          postal_code: "03187",
          address_line1: "123 Main St",
          address_line2: null,
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 6. Create shipping address for order (customer)
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: customer.full_name,
          phone: customer.phone,
          zip_code: "03187",
          address_main: "123 Main St",
          address_detail: "Apt 101",
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 7. Create payment method (admin)
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: "Visa ****1234",
          display_name: "Visa ****1234",
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 8. Customer places order
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 20000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 9. Customer writes review for the product
  const review: IShoppingMallReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_order_id: order.id,
          rating: 5,
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IShoppingMallReview.ICreate,
      },
    );
  typia.assert(review);

  // 10. Admin creates reply to the review (on behalf of seller before updating)
  const reply: IShoppingMallReviewReply =
    await api.functional.shoppingMall.admin.products.reviews.replies.create(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: {
          body: RandomGenerator.content({ paragraphs: 1 }),
          status: "public",
        } satisfies IShoppingMallReviewReply.ICreate,
      },
    );
  typia.assert(reply);
  const prevUpdatedAt = reply.updatedAt;

  // 11. Seller updates the reply
  // Seller context may require connection with seller's Authorization header, but the join endpoint already sets token
  const newReplyBody = RandomGenerator.content({ paragraphs: 2 });
  const newStatus: "hidden" | "public" =
    reply.status === "public" ? "hidden" : "public";
  // update reply via seller endpoint
  const updatedReply: IShoppingMallReviewReply =
    await api.functional.shoppingMall.seller.products.reviews.replies.update(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        replyId: reply.id,
        body: {
          body: newReplyBody,
          status: newStatus,
        } satisfies IShoppingMallReviewReply.IUpdate,
      },
    );
  typia.assert(updatedReply);

  // 12. Assertions: content, status, updated_at check
  TestValidator.notEquals("reply body changed", reply.body, updatedReply.body);
  TestValidator.notEquals(
    "reply status changed",
    reply.status,
    updatedReply.status,
  );
  TestValidator.notEquals(
    "reply updatedAt changed",
    prevUpdatedAt,
    updatedReply.updatedAt,
  );
  TestValidator.equals("reply id unchanged", reply.id, updatedReply.id);
  TestValidator.equals(
    "reply reviewId unchanged",
    reply.reviewId,
    updatedReply.reviewId,
  );
  TestValidator.equals(
    "reply productId unchanged",
    reply.productId,
    updatedReply.productId,
  );
  TestValidator.equals(
    "reply sellerId unchanged",
    reply.sellerId,
    updatedReply.sellerId,
  );
}
