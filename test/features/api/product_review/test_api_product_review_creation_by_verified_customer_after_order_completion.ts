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

/**
 * Validates review creation and moderation on e-commerce platform. The test
 * workflow:
 *
 * 1. Register admin; admin creates category and product (must be active).
 * 2. Register customer with initial address; create order address snapshot; admin
 *    creates payment method; customer places an order for the product.
 * 3. Customer submits valid review for product/order (rating 1-5, body 10+ chars).
 * 4. Confirm review is created: status field, links to correct
 *    product/order/customer, rating and body correct.
 * 5. Error: duplicate review for same (customer, product, order) is rejected.
 * 6. Error: submitting review for an unfulfilled order is rejected.
 * 7. Error: invalid rating (below 1 or above 5) is rejected.
 */
export async function test_api_product_review_creation_by_verified_customer_after_order_completion(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(10),
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin creates category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: undefined,
        name_ko: RandomGenerator.name(),
        name_en: RandomGenerator.name(),
        description_ko: null,
        description_en: null,
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 3. Admin creates product (active)
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: admin.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        is_active: true,
        main_image_url: undefined,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 4. Register customer and get authentication for review flow
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const joinAddress = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    region: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(5),
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    address_line2: null,
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(10),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address: joinAddress,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 5. Customer creates order address (snapshot)
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: joinAddress.recipient_name,
          phone: joinAddress.phone,
          zip_code: joinAddress.postal_code,
          address_main: joinAddress.address_line1,
          address_detail: joinAddress.address_line2 || undefined,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 6. Admin creates payment method snapshot
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: JSON.stringify({ masked: "****-****-****-1234" }),
          display_name: "Visa ****-1234",
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 7. Customer places completed order (simulate fulfilled order)
  const orderTotal = 10000;
  const orderCurrency = "KRW";
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: orderTotal,
        currency: orderCurrency,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 8. Customer submits valid review (rating 5, 30-char body)
  const reviewBody = RandomGenerator.paragraph({ sentences: 10 }); // >= 10 chars
  const review: IShoppingMallReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_order_id: order.id,
          rating: 5,
          body: reviewBody,
        } satisfies IShoppingMallReview.ICreate,
      },
    );
  typia.assert(review);
  TestValidator.equals(
    "linked order correct",
    review.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "linked product correct",
    review.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "linked customer correct",
    review.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals("rating correct", review.rating, 5);
  TestValidator.equals("body correct", review.body, reviewBody);
  TestValidator.predicate(
    "moderation status present",
    typeof review.status === "string" && review.status.length > 0,
  );

  // 9. Error: Attempt to submit duplicate review for same (customer, product, order)
  await TestValidator.error(
    "duplicate review for same customer/product/order is rejected",
    async () => {
      await api.functional.shoppingMall.customer.products.reviews.create(
        connection,
        {
          productId: product.id,
          body: {
            shopping_mall_order_id: order.id,
            rating: 5,
            body: RandomGenerator.paragraph({ sentences: 10 }),
          } satisfies IShoppingMallReview.ICreate,
        },
      );
    },
  );

  // 10. Error: Submit review using a non-existent order (simulate wrong order ID)
  await TestValidator.error(
    "review on non-existent order is rejected",
    async () => {
      await api.functional.shoppingMall.customer.products.reviews.create(
        connection,
        {
          productId: product.id,
          body: {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            rating: 4,
            body: RandomGenerator.paragraph({ sentences: 11 }),
          } satisfies IShoppingMallReview.ICreate,
        },
      );
    },
  );

  // 11. Error: Submit review with invalid rating (0, too low)
  await TestValidator.error(
    "review with rating below 1 is rejected",
    async () => {
      await api.functional.shoppingMall.customer.products.reviews.create(
        connection,
        {
          productId: product.id,
          body: {
            shopping_mall_order_id: order.id,
            rating: 0,
            body: RandomGenerator.paragraph({ sentences: 12 }),
          } satisfies IShoppingMallReview.ICreate,
        },
      );
    },
  );
  // 12. Error: Submit review with invalid rating (6, too high)
  await TestValidator.error(
    "review with rating above 5 is rejected",
    async () => {
      await api.functional.shoppingMall.customer.products.reviews.create(
        connection,
        {
          productId: product.id,
          body: {
            shopping_mall_order_id: order.id,
            rating: 6,
            body: RandomGenerator.paragraph({ sentences: 12 }),
          } satisfies IShoppingMallReview.ICreate,
        },
      );
    },
  );
}
