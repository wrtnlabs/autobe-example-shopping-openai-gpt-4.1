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
 * Test admin ability to flag a product review for moderation/abuse.
 *
 * - Register a new admin user.
 * - Register a customer, obtain default address from registration.
 * - Create a category as admin.
 * - Create a product (admin creates and owns it) in that category.
 * - Create a new payment method snapshot.
 * - Create an order address (customer default address as snapshot).
 * - Create a customer order for the product (order total is arbitrary but
 *   realistic).
 * - Have the customer leave a review for the product using their order.
 * - Now, as admin, flag the review for moderation/abuse, supplying a reason and
 *   an internal note.
 * - Validate that the flag is created, audit fields (admin reference, timestamps)
 *   match, and status is 'open'.
 * - Attempt to create a duplicate flag (same admin, same review); validate error
 *   is raised (business logic).
 * - Attempt to flag a non-existent or deleted review; validate error handling.
 */
export async function test_api_flag_product_review_by_admin_for_moderation_abuse(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SuperSecret123!!",
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register customer (with address)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerAddress = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    region: "Seoul",
    postal_code: "03187",
    address_line1: "123 Gangnam-daero",
    address_line2: "Apt 101",
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "P@ssw0rd!!",
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address: customerAddress,
      },
    });
  typia.assert(customer);

  // 3. Create category (as admin)
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.name(2),
        name_en: RandomGenerator.name(2),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 4. Create product owned by admin in that category
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: admin.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 5. Create payment method snapshot (admin)
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: "visa ****-1234",
          display_name: "Visa Card (ending 1234)",
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 6. Customer creates order address (snapshot for the order)
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: customerAddress.recipient_name,
          phone: customerAddress.phone,
          zip_code: customerAddress.postal_code,
          address_main: customerAddress.address_line1,
          address_detail: customerAddress.address_line2,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 7. Customer places order for the product
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 10000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 8. Customer leaves a review
  const review: IShoppingMallReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_order_id: order.id,
          rating: 5,
          body: RandomGenerator.paragraph({ sentences: 12 }),
        } satisfies IShoppingMallReview.ICreate,
      },
    );
  typia.assert(review);

  // 9. Admin flags the review for moderation/abuse
  const flag: IShoppingMallReviewFlag =
    await api.functional.shoppingMall.admin.products.reviews.flags.create(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: {
          reason: "abuse",
          note: "Automated moderation trigger: suspected abusive language.",
        } satisfies IShoppingMallReviewFlag.ICreate,
      },
    );
  typia.assert(flag);
  TestValidator.equals(
    "flag is linked to the correct review",
    flag.shopping_mall_review_id,
    review.id,
  );
  TestValidator.equals(
    "flag is linked to the correct admin",
    flag.shopping_mall_admin_id,
    admin.id,
  );
  TestValidator.equals("flag status is open", flag.status, "open");
  TestValidator.equals("flag reason", flag.reason, "abuse");
  TestValidator.equals(
    "flag note matches",
    flag.note,
    "Automated moderation trigger: suspected abusive language.",
  );

  // 10. Attempt to flag the same review again (should fail: duplicate flag)
  await TestValidator.error(
    "admin cannot flag the same review twice (duplicate flag prevention)",
    async () => {
      await api.functional.shoppingMall.admin.products.reviews.flags.create(
        connection,
        {
          productId: product.id,
          reviewId: review.id,
          body: {
            reason: "abuse",
            note: "Duplicate attempt.",
          } satisfies IShoppingMallReviewFlag.ICreate,
        },
      );
    },
  );

  // 11. Attempt to flag a non-existent review
  await TestValidator.error(
    "admin cannot flag a non-existent review",
    async () => {
      await api.functional.shoppingMall.admin.products.reviews.flags.create(
        connection,
        {
          productId: product.id,
          reviewId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            reason: "abuse",
            note: "Non-existent review.",
          } satisfies IShoppingMallReviewFlag.ICreate,
        },
      );
    },
  );
}
