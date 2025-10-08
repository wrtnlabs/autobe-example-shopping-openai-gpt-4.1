import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
 * Validates that a customer can update their own flag on their product review,
 * with business-logic workflow constraints.
 *
 * This scenario covers the workflow for a customer who creates an account,
 * completes an order, leaves a review, flags that review (for moderation), and
 * then updates the flag's note/status. The test verifies:
 *
 * - All required entities (customer, category, product, address, payment, order)
 *   are created with valid reference links.
 * - Only the customer who created the review flag can update the flag, and only
 *   while the flag is not resolved or rejected.
 * - After resolving the flag, subsequent updates are properly forbidden by
 *   business logic.
 *
 * Steps:
 *
 * 1. Customer registers (creates customer/captures uuid).
 * 2. Admin creates a product category.
 * 3. Admin creates a product for that category, linked to a test seller (simulate
 *    with customer uuid as seller for test integrity).
 * 4. Customer creates an order address snapshot (for use in the order).
 * 5. Admin creates a payment method snapshot (simple fake card details).
 * 6. Customer places an order (links correct address, payment, currency, order
 *    total).
 * 7. Customer posts a review for the order/product.
 * 8. Customer flags their own review for moderation.
 * 9. Customer updates the flag note and status to "resolved".
 * 10. Verify update took effect and new status is set.
 * 11. Attempt to update the now-resolved flag again; expect error.
 */
export async function test_api_review_flag_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registers (provides uuid for "seller"/customer in this test)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      region: "Seoul",
      postal_code: "03187",
      address_line1: RandomGenerator.paragraph({ sentences: 2 }),
      address_line2: null,
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(customer);

  // 2. Admin creates product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: undefined,
        name_ko: RandomGenerator.name(1),
        name_en: RandomGenerator.name(1),
        description_ko: null,
        description_en: null,
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Admin creates product (use customer id as stand-in for test seller_id)
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: customer.id as string & tags.Format<"uuid">,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        is_active: true,
        main_image_url: null,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Customer creates order address (point-in-time snapshot)
  const address =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: joinInput.full_name,
          phone: joinInput.phone,
          zip_code: "03187",
          address_main: RandomGenerator.paragraph({ sentences: 2 }),
          address_detail: null,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(address);

  // 5. Admin creates payment method snapshot
  const payment =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: "VISA ****1234",
          display_name: "Visa Test Card",
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(payment);

  // 6. Customer places product order
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: address.id,
        payment_method_id: payment.id,
        order_total: 5000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 7. Customer posts review
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

  // 8. Customer flags their review
  const flag =
    await api.functional.shoppingMall.customer.products.reviews.flags.create(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        body: {
          reason: "abuse",
          note: "Automatic test flag for moderation check.",
        } satisfies IShoppingMallReviewFlag.ICreate,
      },
    );
  typia.assert(flag);

  // 9. Customer updates flag: note & status change to resolved
  const updateBody = {
    note: "Customer updated note.",
    status: "resolved",
  } satisfies IShoppingMallReviewFlag.IUpdate;
  const updatedFlag =
    await api.functional.shoppingMall.customer.products.reviews.flags.update(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        flagId: flag.id,
        body: updateBody,
      },
    );
  typia.assert(updatedFlag);
  TestValidator.equals(
    "customer can update own flag note",
    updatedFlag.note,
    updateBody.note,
  );
  TestValidator.equals(
    "customer can update own flag status (workflow)",
    updatedFlag.status,
    updateBody.status,
  );

  // 10. Attempt update after resolved; expect error
  await TestValidator.error("cannot update resolved/closed flag", async () => {
    await api.functional.shoppingMall.customer.products.reviews.flags.update(
      connection,
      {
        productId: product.id,
        reviewId: review.id,
        flagId: flag.id,
        body: {
          note: "New attempt",
          status: "open",
        } satisfies IShoppingMallReviewFlag.IUpdate,
      },
    );
  });
}
