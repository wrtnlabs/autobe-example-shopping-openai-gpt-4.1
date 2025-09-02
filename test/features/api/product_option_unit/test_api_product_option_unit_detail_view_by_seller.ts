import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptions";
import type { IShoppingMallAiBackendProductOptionUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnits";
import type { IShoppingMallAiBackendProductOptionUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnit";

/**
 * E2E test for product option unit detail view by seller.
 *
 * 1. Register seller account
 * 2. Create product (as that seller)
 * 3. Add option group to product
 * 4. Add unit to option group
 * 5. Retrieve unit detail and assert correctness (as owner)
 * 6. Attempt unauthorized access to option unit detail (should fail)
 * 7. Attempt to fetch non-existent or mismatched unit (should fail)
 */
export async function test_api_product_option_unit_detail_view_by_seller(
  connection: api.IConnection,
) {
  // 1. Register new seller, establish authentication
  const sellerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendSeller.ICreate;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);
  TestValidator.equals(
    "auth returned active seller",
    sellerAuth.seller.is_active,
    true,
  );
  TestValidator.equals(
    "auth returned verified seller",
    sellerAuth.seller.is_verified,
    true,
  );

  // 2. Create product as authenticated seller
  const productInput = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 16,
      wordMin: 3,
      wordMax: 8,
    }),
    product_type: RandomGenerator.pick(["physical", "digital"] as const),
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: RandomGenerator.alphaNumeric(5),
    sort_priority: 1,
  } satisfies IShoppingMallAiBackendProduct.ICreate;
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);
  TestValidator.equals(
    "product title matches",
    product.title,
    productInput.title,
  );

  // 3. Add option group
  const optionInput = {
    option_name: RandomGenerator.pick(["색상", "사이즈", "스타일"] as const),
    required: true,
    sort_order: 1,
  } satisfies IShoppingMallAiBackendProductOptions.ICreate;
  const optionGroup =
    await api.functional.shoppingMallAiBackend.seller.products.options.create(
      connection,
      {
        productId: product.id,
        body: optionInput,
      },
    );
  typia.assert(optionGroup);
  TestValidator.equals(
    "option group name",
    optionGroup.option_name,
    optionInput.option_name,
  );

  // 4. Add unit (e.g., color/size variant)
  const unitInput = {
    shopping_mall_ai_backend_product_options_id: optionGroup.id,
    unit_value: RandomGenerator.pick([
      "Red",
      "Blue",
      "Large",
      "Small",
    ] as const),
    unit_code: RandomGenerator.alphaNumeric(6),
    sort_order: 1,
  } satisfies IShoppingMallAiBackendProductOptionUnit.ICreate;
  const optionUnit =
    await api.functional.shoppingMallAiBackend.seller.products.options.units.create(
      connection,
      {
        productId: product.id,
        optionId: optionGroup.id,
        body: unitInput,
      },
    );
  typia.assert(optionUnit);
  TestValidator.equals(
    "unit value matches",
    optionUnit.unit_value,
    unitInput.unit_value,
  );

  // 5. Retrieve unit detail by seller
  const unitDetail =
    await api.functional.shoppingMallAiBackend.seller.products.options.units.at(
      connection,
      {
        productId: product.id,
        optionId: optionGroup.id,
        unitId: optionUnit.id,
      },
    );
  typia.assert(unitDetail);
  // All fields should match those created
  TestValidator.equals(
    "detail unit value",
    unitDetail.unit_value,
    unitInput.unit_value,
  );
  TestValidator.equals("unit id", unitDetail.id, optionUnit.id);
  TestValidator.equals(
    "parent option id",
    unitDetail.shopping_mall_ai_backend_product_options_id,
    optionGroup.id,
  );

  // 6. Attempt unauthorized access (no auth)
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.shoppingMallAiBackend.seller.products.options.units.at(
      unauthConn,
      {
        productId: product.id,
        optionId: optionGroup.id,
        unitId: optionUnit.id,
      },
    );
  });

  // 7. Attempt to fetch non-existent unit
  await TestValidator.error(
    "fetching non-existent unit should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.options.units.at(
        connection,
        {
          productId: product.id,
          optionId: optionGroup.id,
          unitId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 7b. Attempt to fetch a unit using mismatched productId, optionId (simulate wrong associations)
  await TestValidator.error(
    "fetch with mismatched product/option/unit IDs fails",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.options.units.at(
        connection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          optionId: optionGroup.id,
          unitId: optionUnit.id,
        },
      );
    },
  );
}
