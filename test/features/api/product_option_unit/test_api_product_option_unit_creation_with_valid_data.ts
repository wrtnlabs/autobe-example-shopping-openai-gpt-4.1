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

export async function test_api_product_option_unit_creation_with_valid_data(
  connection: api.IConnection,
) {
  /**
   * Validate successful creation of a new option unit (such as 'Color: Red')
   * for a product as a seller.
   *
   * This test encompasses the full seller workflow for creating selectable
   * option units:
   *
   * 1. Register a seller account (ensures authentication and authority for OP
   *    creation).
   * 2. Create a product listing for which option groups and units will be added.
   * 3. Create an option group (e.g., 'Color') in the context of that product.
   * 4. Create a valid and unique option unit within the group (e.g., value='Red'),
   *    following all field and business rules.
   * 5. Assert the correct creation, field values, audit fields, and that the
   *    record is not deleted.
   *
   * Each step is validated against business logic and DTO type requirements.
   */

  // 1. Register a seller and authenticate (token handled by SDK)
  const sellerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendSeller.ICreate;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);

  // 2. Seller creates a product
  const productInput = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 8,
    }),
    product_type: "physical",
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 20,
    tax_code: RandomGenerator.alphaNumeric(7),
    sort_priority: 0,
  } satisfies IShoppingMallAiBackendProduct.ICreate;
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      {
        body: productInput,
      },
    );
  typia.assert(product);

  // 3. Add an option group to the product
  const optionGroupInput = {
    option_name: "Color",
    required: true,
    sort_order: 0,
  } satisfies IShoppingMallAiBackendProductOptions.ICreate;
  const optionGroup =
    await api.functional.shoppingMallAiBackend.seller.products.options.create(
      connection,
      {
        productId: product.id,
        body: optionGroupInput,
      },
    );
  typia.assert(optionGroup);

  // 4. Create a new option unit (unique within the group)
  const unitInput = {
    shopping_mall_ai_backend_product_options_id: optionGroup.id,
    unit_value: "Red",
    unit_code: RandomGenerator.alphaNumeric(6),
    sort_order: 0,
  } satisfies IShoppingMallAiBackendProductOptionUnit.ICreate;
  const unit =
    await api.functional.shoppingMallAiBackend.seller.products.options.units.create(
      connection,
      {
        productId: product.id,
        optionId: optionGroup.id,
        body: unitInput,
      },
    );
  typia.assert(unit);

  // 5. Business logic and field assertions
  TestValidator.equals(
    "option unit group reference is correct",
    unit.shopping_mall_ai_backend_product_options_id,
    optionGroup.id,
  );
  TestValidator.equals(
    "option unit value is set as input",
    unit.unit_value,
    unitInput.unit_value,
  );
  TestValidator.equals(
    "option unit code is set and unique",
    unit.unit_code,
    unitInput.unit_code,
  );
  TestValidator.equals(
    "option unit sort_order is correct",
    unit.sort_order,
    unitInput.sort_order,
  );
  TestValidator.predicate(
    "option unit created_at field is present",
    typeof unit.created_at === "string" && !!unit.created_at,
  );
  TestValidator.predicate(
    "option unit updated_at field is present",
    typeof unit.updated_at === "string" && !!unit.updated_at,
  );
  TestValidator.equals(
    "option unit not deleted (deleted_at=null)",
    unit.deleted_at,
    null,
  );
}
