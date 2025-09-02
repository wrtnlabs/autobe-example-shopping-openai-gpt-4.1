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

export async function test_api_product_option_unit_update_by_owner_seller(
  connection: api.IConnection,
) {
  /**
   * E2E test: Seller updates their product's option unit (unit_value/sort_order
   * update) and verifies business logic.
   *
   * Steps:
   *
   * 1. Register seller via seller join/auth (API: auth.seller.join)
   * 2. Create a product (API: seller.products.create)
   * 3. Add a product option group (API: seller.products.options.create)
   * 4. Add a product option unit (API: seller.products.options.units.create)
   * 5. Update the unit's unit_value and sort_order via update API.
   * 6. Assert update: response reflects correct values, audit fields
   *    ({updated_at}) change, referential fields remain intact.
   * 7. Business rule enforcement: updating unit_code to that of a sibling triggers
   *    error (no duplicates allowed).
   */

  // 1. Seller registration & authentication
  const sellerInput = {
    email: `${RandomGenerator.alphabets(7)}@seller.com`,
    business_registration_number: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAiBackendSeller.ICreate;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);

  // 2. Create product
  const productInput = {
    title: RandomGenerator.name(3),
    slug: RandomGenerator.alphaNumeric(12),
    product_type: "physical",
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 100,
    tax_code: "default",
    sort_priority: 1,
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallAiBackendProduct.ICreate;
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 3. Add an option group
  const optionGroupInput = {
    option_name: RandomGenerator.name(1),
    required: true,
    sort_order: 1,
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

  // 4. Add first option unit
  const unitCode1 = RandomGenerator.alphaNumeric(6);
  const optionUnitInput = {
    shopping_mall_ai_backend_product_options_id: optionGroup.id,
    unit_value: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 7,
      wordMax: 14,
    }),
    unit_code: unitCode1,
    sort_order: 11,
  } satisfies IShoppingMallAiBackendProductOptionUnit.ICreate;
  const optionUnit =
    await api.functional.shoppingMallAiBackend.seller.products.options.units.create(
      connection,
      {
        productId: product.id,
        optionId: optionGroup.id,
        body: optionUnitInput,
      },
    );
  typia.assert(optionUnit);

  // 5. Update the unit (unit_value and sort_order)
  const updatedValue = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 8,
    wordMax: 20,
  });
  const updatedSortOrder = 21;
  const updateInput = {
    unit_value: updatedValue,
    sort_order: updatedSortOrder,
  } satisfies IShoppingMallAiBackendProductOptionUnit.IUpdate;
  const updatedUnit =
    await api.functional.shoppingMallAiBackend.seller.products.options.units.update(
      connection,
      {
        productId: product.id,
        optionId: optionGroup.id,
        unitId: optionUnit.id,
        body: updateInput,
      },
    );
  typia.assert(updatedUnit);
  TestValidator.equals(
    "unit_value updated",
    updatedUnit.unit_value,
    updatedValue,
  );
  TestValidator.equals(
    "sort_order updated",
    updatedUnit.sort_order,
    updatedSortOrder,
  );
  TestValidator.predicate(
    "updated_at timestamp changed after update",
    updatedUnit.updated_at !== optionUnit.updated_at,
  );
  TestValidator.notEquals(
    "created_at and updated_at differ after update",
    updatedUnit.updated_at,
    updatedUnit.created_at,
  );
  TestValidator.equals(
    "parent option id remains",
    updatedUnit.shopping_mall_ai_backend_product_options_id,
    optionGroup.id,
  );
  TestValidator.equals(
    "unit id persists after update",
    updatedUnit.id,
    optionUnit.id,
  );

  // 6. Create a sibling option unit for duplicate test
  const unitCode2 = RandomGenerator.alphaNumeric(7);
  const optionUnit2 =
    await api.functional.shoppingMallAiBackend.seller.products.options.units.create(
      connection,
      {
        productId: product.id,
        optionId: optionGroup.id,
        body: {
          shopping_mall_ai_backend_product_options_id: optionGroup.id,
          unit_value: RandomGenerator.paragraph({ sentences: 1 }),
          unit_code: unitCode2,
          sort_order: 13,
        } satisfies IShoppingMallAiBackendProductOptionUnit.ICreate,
      },
    );
  typia.assert(optionUnit2);

  // 7. Try to update first unit's code to a duplicate (should trigger error)
  await TestValidator.error(
    "should reject update to duplicate unit_code within group",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.options.units.update(
        connection,
        {
          productId: product.id,
          optionId: optionGroup.id,
          unitId: optionUnit.id,
          body: {
            unit_code: optionUnit2.unit_code,
          } satisfies IShoppingMallAiBackendProductOptionUnit.IUpdate,
        },
      );
    },
  );
}
