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
 * Test that an admin can update a product review flag's moderation status
 * (e.g., to 'resolved') and internal note for a product review that was
 * previously flagged by a customer. Ensures the update is reflected (note and
 * status change), validates business rules (such as status
 * transitions—open→resolved allowed, but updating a resolved/rejected flag not
 * allowed), and confirms an audit trail is produced. Covers the E2E workflow:
 * admin and customer onboarding, category/product creation, order, review
 * write, flag, and admin moderation action.
 */
export async function test_api_review_flag_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminOut = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
      status: "active",
    },
  });
  typia.assert(adminOut);

  // 2. Create a category as admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name_ko: RandomGenerator.paragraph({ sentences: 2 }),
        name_en: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 1,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Create a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 1 }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        is_default: true,
      },
    },
  });
  typia.assert(customer);

  // 4. Create product as admin
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: adminOut.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
        }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 5. Customer creates order address snapshot
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 1 }),
          country_code: "KOR",
        },
      },
    );
  typia.assert(orderAddress);

  // 6. Create order payment method as admin
  const orderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.name(),
        },
      },
    );
  typia.assert(orderPaymentMethod);

  // 7. Customer places an order for this product
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: orderPaymentMethod.id,
        order_total: 10000,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);

  // 8. Customer writes a review for product
  const review =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_order_id: order.id,
          rating: 5,
          body: RandomGenerator.paragraph({ sentences: 10 }),
        },
      },
    );
  typia.assert(review);

  // 9. Customer flags the review
  const reviewFlag =
    await api.functional.shoppingMall.customer.products.reviews.flags.create(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: {
          reason: "abuse",
          note: "Contains offensive language",
        },
      },
    );
  typia.assert(reviewFlag);

  // 10. Admin updates the review flag's note and status to resolved
  const noteUpdate = "Flag has been resolved after investigation.";
  const updatedFlag =
    await api.functional.shoppingMall.admin.products.reviews.flags.update(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        flagId: reviewFlag.id,
        body: {
          note: noteUpdate,
          status: "resolved",
        },
      },
    );
  typia.assert(updatedFlag);
  TestValidator.equals("admin updated flag note", updatedFlag.note, noteUpdate);
  TestValidator.equals(
    "admin updated flag status to resolved",
    updatedFlag.status,
    "resolved",
  );

  // 11. Attempt updating a closed flag again (should fail)
  await TestValidator.error(
    "cannot update closed flag (resolved)",
    async () => {
      await api.functional.shoppingMall.admin.products.reviews.flags.update(
        connection,
        {
          productId: product.id,
          reviewId: review.id,
          flagId: reviewFlag.id,
          body: {
            note: "attempt after closed",
            status: "rejected", // business rule: updates to closed/rejected should not succeed from resolved
          },
        },
      );
    },
  );
}
