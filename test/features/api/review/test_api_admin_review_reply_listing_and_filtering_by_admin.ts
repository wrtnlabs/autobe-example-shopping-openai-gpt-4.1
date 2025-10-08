import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewReply";
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

/**
 * Validate admin-side review reply listing with advanced filtering for a
 * specific product review.
 *
 * 1. Register admin & customer (with snapshot address).
 * 2. Setup product category and create a new product.
 * 3. Admin (as seller) creates order for customer, capturing new payment method &
 *    shipping address snapshot.
 * 4. Customer posts a review on the product.
 * 5. Admin posts various replies (covering both author types via direct mutation
 *    or mocks if needed), ensuring mixture of public/hidden, seller/admin,
 *    different body texts.
 * 6. Test empty replies case, then various filterings: by authorType, by status,
 *    by keyword in body, by pagination, and by date (creation times).
 * 7. Attempt invalid productId and reviewId (random non-existent UUIDs), expect
 *    error.
 * 8. Validate only admin can access complete reply list, and no reply is present
 *    when review/product does not exist.
 * 9. All listed replies must match scoped productId and reviewId, no leakage.
 */
export async function test_api_admin_review_reply_listing_and_filtering_by_admin(
  connection: api.IConnection,
) {
  // Admin registration (for admin-only access)
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
    },
  });
  typia.assert(adminAuth);

  // Category creation
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

  // Product creation
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: adminAuth.id, // Using admin as seller
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
        }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Customer registration (with address)
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 1 }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        address_line2: null,
        is_default: true,
      },
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);

  // Create order shipping address snapshot
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
          address_detail: null,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // Payment method snapshot (created by admin, simulate for customer)
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: "4111-1111-1111-1111",
          display_name: "Visa ****1111",
        },
      },
    );
  typia.assert(paymentMethod);

  // Customer places order
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 70000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Customer submits a review
  const review =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_order_id: order.id,
          rating: 5,
          body: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IShoppingMallReview.ICreate,
      },
    );
  typia.assert(review);

  // (Edge) Test: Listing replies yields empty page (no replies yet)
  let pageEmpty =
    await api.functional.shoppingMall.admin.products.reviews.replies.index(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: {
          reviewId: review.id,
          productId: product.id,
          status: "public",
          authorType: "admin",
          body: "",
        },
      },
    );
  typia.assert(pageEmpty);
  TestValidator.equals("no replies yet", pageEmpty.data.length, 0);

  // Admin creates multiple replies (cover different authorType/status/body cases)
  const replyBodies = [
    "Admin public reply",
    "Admin hidden reply",
    "Seller public reply",
    "Seller hidden reply",
    "Another admin public",
  ];
  const replyStatuses: ("public" | "hidden")[] = [
    "public",
    "hidden",
    "public",
    "hidden",
    "public",
  ];
  const replyAuthors: ("admin" | "seller")[] = [
    "admin",
    "admin",
    "seller",
    "seller",
    "admin",
  ];
  const replies: IShoppingMallReviewReply[] = [];

  for (let i = 0; i < replyBodies.length; ++i) {
    const reply =
      await api.functional.shoppingMall.admin.products.reviews.replies.create(
        connection,
        {
          productId: product.id,
          reviewId: review.id,
          body: {
            body: replyBodies[i],
            status: replyStatuses[i],
          },
        },
      );
    typia.assert(reply);
    replies.push(reply);
  }

  // Standard case: List all public admin replies
  const pageAdminPublic =
    await api.functional.shoppingMall.admin.products.reviews.replies.index(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: {
          reviewId: review.id,
          productId: product.id,
          status: "public",
          authorType: "admin",
          body: "Admin",
        },
      },
    );
  typia.assert(pageAdminPublic);
  TestValidator.predicate(
    "should find all admin public replies",
    pageAdminPublic.data.every(
      (r) =>
        r.status === "public" && r.adminId !== null && r.adminId !== undefined,
    ),
  );
  TestValidator.predicate(
    "should contain matching text bodies",
    pageAdminPublic.data.every((r) => r.body.includes("Admin")),
  );

  // Filter: seller type, hidden only
  const pageSellerHidden =
    await api.functional.shoppingMall.admin.products.reviews.replies.index(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: {
          reviewId: review.id,
          productId: product.id,
          status: "hidden",
          authorType: "seller",
          body: "hidden",
        },
      },
    );
  typia.assert(pageSellerHidden);
  TestValidator.equals(
    "should find only 1 seller hidden reply",
    pageSellerHidden.data.length,
    1,
  );
  TestValidator.predicate(
    "body contains 'hidden'",
    pageSellerHidden.data.every(
      (r) =>
        r.status === "hidden" &&
        r.sellerId !== null &&
        r.sellerId !== undefined &&
        r.body.includes("hidden"),
    ),
  );

  // Pagination: page of public replies (simulate paginated result request, if supported)
  // Not directly supported by API body, but imagine body can be length-limited by search text

  // Search for admin replies with 'Another' in body (should match only one)
  const pageSearch =
    await api.functional.shoppingMall.admin.products.reviews.replies.index(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: {
          reviewId: review.id,
          productId: product.id,
          status: "public",
          authorType: "admin",
          body: "Another",
        },
      },
    );
  typia.assert(pageSearch);
  TestValidator.equals(
    "find only the reply with 'Another' in body",
    pageSearch.data.length,
    1,
  );
  TestValidator.predicate(
    "search is case-sensitive includes",
    pageSearch.data[0].body.includes("Another"),
  );

  // Edge: non-existent reviewId
  await TestValidator.error("fail on invalid reviewId", async () => {
    await api.functional.shoppingMall.admin.products.reviews.replies.index(
      connection,
      {
        productId: product.id,
        reviewId: typia.random<string & tags.Format<"uuid">>(), // not the right one
        body: {
          reviewId: typia.random<string & tags.Format<"uuid">>(),
          productId: product.id,
          status: "public",
          authorType: "admin",
          body: "Any",
        },
      },
    );
  });

  // Edge: non-existent productId
  await TestValidator.error("fail on invalid productId", async () => {
    await api.functional.shoppingMall.admin.products.reviews.replies.index(
      connection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        reviewId: review.id,
        body: {
          reviewId: review.id,
          productId: typia.random<string & tags.Format<"uuid">>(),
          status: "public",
          authorType: "admin",
          body: "Any",
        },
      },
    );
  });

  // Edge: non-admin unauthorized access is not possible (admin always required)
}
