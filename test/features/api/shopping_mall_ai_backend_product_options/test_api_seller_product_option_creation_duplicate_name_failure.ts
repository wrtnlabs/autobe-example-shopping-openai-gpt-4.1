import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptions";

/**
 * Test failure when attempting to create a product option group with a
 * duplicate name for the same product.
 *
 * This test validates the enforcement of the unique constraint for
 * option_name within a single product. Steps:
 *
 * 1. Register a seller and obtain authentication.
 * 2. Create a new product as the seller.
 * 3. Create an initial product option group (e.g., option_name = 'color').
 * 4. Attempt to create a second option group for the same product with the
 *    identical option_name ('color').
 * 5. The API should reject the second creation due to the uniqueness
 *    constraint on option_name per product and return a business validation
 *    error.
 * 6. If the error is not thrown, the test should fail; otherwise, the test
 *    should pass as expected.
 */
export async function test_api_seller_product_option_creation_duplicate_name_failure(
  connection: api.IConnection,
) {
  // 1. Register a new seller and authenticate
  const sellerEmail = `${RandomGenerator.alphabets(10)}@test-biz.com`;
  const sellerRegNo = RandomGenerator.alphaNumeric(12);
  const sellerName = RandomGenerator.name();
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_registration_number: sellerRegNo,
      name: sellerName,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerAuth);
  TestValidator.predicate(
    "seller token issued",
    typeof sellerAuth.token.access === "string" &&
      !!sellerAuth.token.access.length,
  );

  // 2. Create a product
  const productInput = {
    title: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 4,
      sentenceMax: 8,
      wordMin: 3,
      wordMax: 8,
    }),
    product_type: "physical",
    business_status: "draft",
    min_order_quantity: 1,
    max_order_quantity: 3,
    tax_code: RandomGenerator.alphaNumeric(6),
    sort_priority: 0,
  } satisfies IShoppingMallAiBackendProduct.ICreate;
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);
  TestValidator.equals(
    "created product has requested title",
    product.title,
    productInput.title,
  );

  // 3. Create initial product option group (e.g., 'color')
  const optionName = "color";
  const initialOption =
    await api.functional.shoppingMallAiBackend.seller.products.options.create(
      connection,
      {
        productId: product.id,
        body: {
          option_name: optionName,
          required: true,
          sort_order: 0,
        } satisfies IShoppingMallAiBackendProductOptions.ICreate,
      },
    );
  typia.assert(initialOption);
  TestValidator.equals(
    "option group option_name matches initial",
    initialOption.option_name,
    optionName,
  );

  // 4. Attempt to create a duplicate option_name group on the same product
  await TestValidator.error(
    "should not allow duplicate option_name for same product",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.options.create(
        connection,
        {
          productId: product.id,
          body: {
            option_name: optionName,
            required: false,
            sort_order: 1,
          } satisfies IShoppingMallAiBackendProductOptions.ICreate,
        },
      );
    },
  );
}
