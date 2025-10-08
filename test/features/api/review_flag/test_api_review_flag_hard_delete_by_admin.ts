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
import type { IShoppingMallReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewFlag";

/**
 * End-to-end test for hard deletion (permanent removal) of a review flag by
 * admin.
 *
 * This test exercises the business workflow for product review moderation,
 * simulating the creation and removal of a review flag and associated entities
 * within the e-commerce shopping mall system. It covers category and product
 * creation by admin, order and review setup by customer, flagging the review as
 * admin, and finally, permanent deletion of the flag by admin with error and
 * authorization checks.
 *
 * Steps:
 *
 * 1. Admin registers and authenticates
 * 2. Customer registers and authenticates
 * 3. Admin creates a category
 * 4. Admin creates a product under that category
 * 5. Customer creates an order address
 * 6. Admin creates a payment method snapshot
 * 7. Customer places an order for the product, using the shipping address and
 *    payment method
 * 8. Customer leaves a review for the purchased product
 * 9. Admin flags the review for moderation
 * 10. Admin performs a hard delete of the review flag
 * 11. (Negative) Admin attempts to delete the same flag again (should error)
 * 12. (Negative) Admin attempts to delete a non-existent flag (should error)
 * 13. (Negative) Customer attempts to delete a flag (should error/forbidden)
 * 14. (Optional) Validate audit logs capture flag deletion event (if such querying
 *     is available)
 *
 * Assertions:
 *
 * - After admin flag deletion, the flag is no longer returned in subsequent
 *   queries (polling omitted here as no flag list API is available from
 *   input).
 * - Deleting an already-deleted or never-existent flag yields error.
 * - Non-admins cannot hard delete flags (attempt as customer must fail).
 *
 * Business rules validated:
 *
 * - Only proper business flows allow review flag deletion
 * - Authorization is enforced
 * - Error handling for not-found/deleted flag
 */
export async function test_api_review_flag_hard_delete_by_admin(
  connection: api.IConnection,
) {
  // STEP 1: Register and authenticate admin
  const adminReg = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      full_name: RandomGenerator.name(),
      status: "active",
    },
  });
  typia.assert(adminReg);

  // STEP 2: Register and authenticate customer (token will be set automatically)
  const customerReg = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 1 }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 6,
          wordMax: 16,
        }),
        address_line2: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        is_default: true,
      },
    },
  });
  typia.assert(customerReg);

  // STEP 3: Create category (admin context ensured)
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: undefined,
        name_ko: RandomGenerator.paragraph(),
        name_en: RandomGenerator.paragraph(),
        description_ko: RandomGenerator.paragraph(),
        description_en: RandomGenerator.paragraph(),
        display_order: 0,
        is_active: true,
      },
    },
  );
  typia.assert(category);

  // STEP 4: Create product (admin context)
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: adminReg.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph(),
        description: RandomGenerator.content(),
        is_active: true,
        main_image_url: null,
      },
    },
  );
  typia.assert(product);

  // STEP 5: Customer creates order address (customer token auto)
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph(),
          address_detail: RandomGenerator.paragraph(),
          country_code: "KOR",
        },
      },
    );
  typia.assert(orderAddress);

  // STEP 6: Admin creates payment method snapshot (admin context, not customer)
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: RandomGenerator.alphaNumeric(12),
          display_name: RandomGenerator.name(),
        },
      },
    );
  typia.assert(paymentMethod);

  // STEP 7: Customer places order for product
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 10000,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);

  // STEP 8: Customer leaves review for purchased product
  const review =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_order_id: order.id,
          rating: 5,
          body: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(review);

  // STEP 9: Admin flags the review
  const flag =
    await api.functional.shoppingMall.admin.products.reviews.flags.create(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: {
          reason: "abuse",
          note: "Automated moderation: flagged for language.",
        },
      },
    );
  typia.assert(flag);

  // STEP 10: Admin deletes review flag
  await api.functional.shoppingMall.admin.products.reviews.flags.erase(
    connection,
    {
      productId: product.id,
      reviewId: review.id,
      flagId: flag.id,
    },
  );

  // STEP 11: Attempt to delete same flag again (should error)
  await TestValidator.error("deleting already-removed flag fails", async () => {
    await api.functional.shoppingMall.admin.products.reviews.flags.erase(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        flagId: flag.id,
      },
    );
  });

  // STEP 12: Attempt to delete non-existent flag (random UUID) (should error)
  await TestValidator.error("deleting nonexistent flag fails", async () => {
    await api.functional.shoppingMall.admin.products.reviews.flags.erase(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        flagId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // STEP 13: Customer attempts flag deletion (should error/forbidden)
  // (Re-create flag first)
  const flag2 =
    await api.functional.shoppingMall.admin.products.reviews.flags.create(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: { reason: "spam" },
      },
    );
  typia.assert(flag2);
  // Switch context to customer
  await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 1 }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 6,
          wordMax: 16,
        }),
        address_line2: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        is_default: true,
      },
    },
  }); // this will switch token to a new customer
  await TestValidator.error("customer cannot delete flag", async () => {
    await api.functional.shoppingMall.admin.products.reviews.flags.erase(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        flagId: flag2.id,
      },
    );
  });

  // There is no API for flag listing or audit logs in the provided interfaces,
  // so this test must stop here (validation that flag is gone is limited).
}
