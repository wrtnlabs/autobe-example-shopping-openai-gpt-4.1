import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewFlag";
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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate admin listing and moderation for abuse flags on product reviews.
 *
 * 1. Register admin, seller, customer.
 * 2. Create category (admin).
 * 3. Create product (admin, assigned to seller).
 * 4. Create address/payment method (customer/admin for customer).
 * 5. Customer places order for product.
 * 6. Customer submits review.
 * 7. Customer, seller, and admin each flag the review.
 * 8. Admin lists all flags, tests search/status filters, ensures audit fields,
 *    validates non-admin permission error.
 * 9. Edge case: Review w/ no flags.
 * 10. Edge case: Filter for missing status/reason.
 */
export async function test_api_admin_review_flag_list_and_moderation_visibility(
  connection: api.IConnection,
) {
  // 1. Register system actors
  // Admin
  const adminJoin = typia.random<IShoppingMallAdmin.ICreate>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoin,
  });
  typia.assert(admin);
  // Seller
  const sellerJoin = typia.random<IShoppingMallSeller.IJoin>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerJoin,
  });
  typia.assert(seller);
  // Customer
  const customerJoin = typia.random<IShoppingMallCustomer.IJoin>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerJoin,
  });
  typia.assert(customer);

  // 2. Create category as admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: typia.random<IShoppingMallCategory.ICreate>() },
  );
  typia.assert(category);

  // 3. Create product as admin (assigned to seller)
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        ...typia.random<IShoppingMallProduct.ICreate>(),
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        is_active: true,
      },
    },
  );
  typia.assert(product);

  // 4. Customer: create order address, and admin: create payment method for order
  // Re-auth as customer
  await api.functional.auth.customer.join(connection, { body: customerJoin });
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      { body: typia.random<IShoppingMallOrderAddress.ICreate>() },
    );
  typia.assert(orderAddress);
  // Switch to admin and create payment method for order
  await api.functional.auth.admin.join(connection, { body: adminJoin });
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      { body: typia.random<IShoppingMallOrderPaymentMethod.ICreate>() },
    );
  typia.assert(paymentMethod);
  // Switch back to customer for placing order
  await api.functional.auth.customer.join(connection, { body: customerJoin });

  // 5. Customer places order for product
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 21900,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 6. Customer submits review
  const review =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_order_id: order.id,
          rating: 5,
          body: RandomGenerator.paragraph({ sentences: 18 }),
        },
      },
    );
  typia.assert(review);

  // 7. Three distinct flags
  // (a) Customer flags
  const customerFlag =
    await api.functional.shoppingMall.customer.products.reviews.flags.create(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: { reason: "abuse", note: "user found abusive content" },
      },
    );
  typia.assert(customerFlag);
  // (b) Switch to seller and submit flag
  await api.functional.auth.seller.join(connection, { body: sellerJoin });
  const sellerFlag =
    await api.functional.shoppingMall.seller.products.reviews.flags.create(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: { reason: "spam", note: "seller marking as spam" },
      },
    );
  typia.assert(sellerFlag);
  // (c) Switch to admin and submit flag
  await api.functional.auth.admin.join(connection, { body: adminJoin });
  const adminFlag =
    await api.functional.shoppingMall.admin.products.reviews.flags.create(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: {
          reason: "policy_violation",
          note: "admin: moderation rule broken",
        },
      },
    );
  typia.assert(adminFlag);

  // 8. Admin: list all flags, test filter logic and audit info
  // List all flags for review (no filter)
  const allFlags =
    await api.functional.shoppingMall.admin.products.reviews.flags.index(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: { reviewId: review.id, reason: "", note: undefined },
      },
    );
  typia.assert(allFlags);
  TestValidator.equals("all flags count", allFlags.data.length, 3);
  // Filter by reason (e.g., "spam")
  const spamFlags =
    await api.functional.shoppingMall.admin.products.reviews.flags.index(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: { reviewId: review.id, reason: "spam", note: undefined },
      },
    );
  typia.assert(spamFlags);
  TestValidator.predicate(
    "has at least 1 spam flag",
    spamFlags.data.some((f) => f.reason === "spam"),
  );
  // Filter by status (default open)
  const openFlags =
    await api.functional.shoppingMall.admin.products.reviews.flags.index(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: { reviewId: review.id, reason: "", note: undefined },
      },
    );
  typia.assert(openFlags);
  TestValidator.predicate(
    "flags are open status (default)",
    openFlags.data.every((f) => f.status === "open"),
  );
  // Audit fields present
  openFlags.data.forEach((flag) => {
    TestValidator.predicate(
      "flag has audit fields",
      typeof flag.created_at === "string" &&
        typeof flag.updated_at === "string",
    );
    TestValidator.predicate(
      "flag references review",
      flag.shopping_mall_review_id === review.id,
    );
  });

  // (negative) Non-admin access denied: switch to customer, try list flags as admin
  await api.functional.auth.customer.join(connection, { body: customerJoin });
  await TestValidator.error(
    "non-admin cannot access flag moderation view",
    async () => {
      await api.functional.shoppingMall.admin.products.reviews.flags.index(
        connection,
        {
          productId: product.id,
          reviewId: review.id,
          body: { reviewId: review.id, reason: "", note: undefined },
        },
      );
    },
  );

  // 9. Edge: review with no flags
  // Create a new product and review
  await api.functional.auth.admin.join(connection, { body: adminJoin });
  const blankProduct = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        ...typia.random<IShoppingMallProduct.ICreate>(),
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        is_active: true,
      },
    },
  );
  typia.assert(blankProduct);
  // Customer creates order for new product
  await api.functional.auth.customer.join(connection, { body: customerJoin });
  const orderBlank = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 23900,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(orderBlank);
  const blankReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: blankProduct.id,
        body: {
          shopping_mall_order_id: orderBlank.id,
          rating: 4,
          body: RandomGenerator.paragraph({ sentences: 12 }),
        },
      },
    );
  typia.assert(blankReview);
  await api.functional.auth.admin.join(connection, { body: adminJoin });
  const flagNone =
    await api.functional.shoppingMall.admin.products.reviews.flags.index(
      connection,
      {
        productId: blankProduct.id,
        reviewId: blankReview.id,
        body: { reviewId: blankReview.id, reason: "", note: undefined },
      },
    );
  typia.assert(flagNone);
  TestValidator.equals("no flags for clean review", flagNone.data.length, 0);

  // 10. Filter for status/reason yielding zero flags
  const noMatch =
    await api.functional.shoppingMall.admin.products.reviews.flags.index(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: {
          reviewId: review.id,
          reason: "not_a_real_reason",
          note: undefined,
        },
      },
    );
  typia.assert(noMatch);
  TestValidator.equals(
    "no flags found for missing reason",
    noMatch.data.length,
    0,
  );
}
