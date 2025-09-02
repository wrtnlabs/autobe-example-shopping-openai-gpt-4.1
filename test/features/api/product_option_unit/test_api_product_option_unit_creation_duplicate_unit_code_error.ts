import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptions";
import type { IShoppingMallAiBackendProductOptionUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnit";
import type { IShoppingMallAiBackendProductOptionUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnits";

export async function test_api_product_option_unit_creation_duplicate_unit_code_error(
  connection: api.IConnection,
) {
  /**
   * Validates failure when creating a product option unit with a duplicate
   * unit_code within one option group.
   *
   * Steps:
   *
   * 1. Register a new seller (establish authenticated context)
   * 2. Create a new product
   * 3. Create a new product option group for that product
   * 4. Add the first option unit with a unique unit_code (success)
   * 5. Attempt to add a second unit with the SAME unit_code value to the same
   *    option group (should fail)
   * 6. Validate proper error handling for unit_code duplication
   */

  // 1. Register Seller (setup authentication)
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerJoin);

  // 2. Create Product
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      {
        body: {
          title: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 8,
            wordMin: 4,
            wordMax: 9,
          }),
          product_type: RandomGenerator.pick([
            "physical",
            "digital",
            "service",
          ] as const),
          business_status: "active",
          min_order_quantity: 1,
          max_order_quantity: 10,
          tax_code: RandomGenerator.alphaNumeric(6),
          sort_priority: 0,
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Create Option Group
  const optionGroup =
    await api.functional.shoppingMallAiBackend.seller.products.options.create(
      connection,
      {
        productId: product.id,
        body: {
          option_name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
          required: true,
          sort_order: 1,
        } satisfies IShoppingMallAiBackendProductOptions.ICreate,
      },
    );
  typia.assert(optionGroup);

  // 4. Add first unit (with unique unit_code)
  const duplicateCode = RandomGenerator.alphaNumeric(8); // code to duplicate
  const unit1 =
    await api.functional.shoppingMallAiBackend.seller.products.options.units.create(
      connection,
      {
        productId: product.id,
        optionId: optionGroup.id,
        body: {
          shopping_mall_ai_backend_product_options_id: optionGroup.id,
          unit_value: RandomGenerator.name(1),
          unit_code: duplicateCode,
          sort_order: 1,
        } satisfies IShoppingMallAiBackendProductOptionUnit.ICreate,
      },
    );
  typia.assert(unit1);

  // 5. Attempt to add second unit with same unit_code (should fail)
  await TestValidator.error(
    "cannot create duplicate unit_code in same option group",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.options.units.create(
        connection,
        {
          productId: product.id,
          optionId: optionGroup.id,
          body: {
            shopping_mall_ai_backend_product_options_id: optionGroup.id,
            unit_value: RandomGenerator.name(1),
            unit_code: duplicateCode, // duplicate
            sort_order: 2,
          } satisfies IShoppingMallAiBackendProductOptionUnit.ICreate,
        },
      );
    },
  );
}
