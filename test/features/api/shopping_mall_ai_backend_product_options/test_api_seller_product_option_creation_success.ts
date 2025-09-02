import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptions";

export async function test_api_seller_product_option_creation_success(
  connection: api.IConnection,
) {
  /**
   * E2E: Seller product option group creation success scenario
   *
   * Validates that a newly registered seller can successfully create an option
   * group (e.g., color, size) for a product they own.
   *
   * Steps:
   *
   * 1. Register as a new seller via /auth/seller/join, storing token and profile
   * 2. Create a new product as this authenticated seller
   * 3. Create a new option group for the product, with a unique option_name,
   *    required flag, and explicit sort_order
   * 4. Assert that the returned option group record matches the creation request
   *    and is correctly linked to the given product
   * 5. All IDs, dates, and required fields are type-safe and match the API
   *    contract
   */

  // Step 1: Register a seller and authenticate
  const sellerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAiBackendSeller.ICreate;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);

  // Step 2: Create a new product as this seller
  const productInput = {
    title: RandomGenerator.name(3),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
    product_type: RandomGenerator.pick([
      "physical",
      "digital",
      "subscription",
    ] as const),
    business_status: RandomGenerator.pick([
      "active",
      "draft",
      "paused",
    ] as const),
    min_order_quantity: 1,
    max_order_quantity: 20,
    tax_code: RandomGenerator.alphaNumeric(6),
    sort_priority: 10,
  } satisfies IShoppingMallAiBackendProduct.ICreate;
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);
  TestValidator.equals(
    "product title matches input",
    product.title,
    productInput.title,
  );
  TestValidator.equals(
    "product slug matches input",
    product.slug,
    productInput.slug,
  );
  TestValidator.equals(
    "business status matches",
    product.business_status,
    productInput.business_status,
  );

  // Step 3: Create a product option group (e.g., color)
  const optionInput = {
    option_name: RandomGenerator.pick(["색상", "사이즈", "추가구성"] as const),
    required: true,
    sort_order: 1,
  } satisfies IShoppingMallAiBackendProductOptions.ICreate;
  const option =
    await api.functional.shoppingMallAiBackend.seller.products.options.create(
      connection,
      {
        productId: product.id,
        body: optionInput,
      },
    );
  typia.assert(option);

  // Step 4: Assert linkage and correctness
  TestValidator.equals(
    "option group links to product",
    option.shopping_mall_ai_backend_products_id,
    product.id,
  );
  TestValidator.equals(
    "option_name matches input",
    option.option_name,
    optionInput.option_name,
  );
  TestValidator.equals(
    "option group 'required' matches input",
    option.required,
    optionInput.required,
  );
  TestValidator.equals(
    "option group sort_order matches input",
    option.sort_order,
    optionInput.sort_order,
  );

  // Step 5: ID, date, and type integrity
  TestValidator.predicate(
    "option.id is valid uuid",
    typeof option.id === "string" && option.id.length > 0,
  );
  TestValidator.predicate(
    "option.created_at valid date-time",
    typeof option.created_at === "string" && option.created_at.length > 0,
  );
  TestValidator.predicate(
    "option.updated_at valid date-time",
    typeof option.updated_at === "string" && option.updated_at.length > 0,
  );
}
