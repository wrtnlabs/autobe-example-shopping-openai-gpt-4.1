import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptions";
import type { IShoppingMallAiBackendProductOptionUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnits";
import type { IPageIShoppingMallAiBackendProductOptionUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductOptionUnits";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IShoppingMallAiBackendProductOptionUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnit";

export async function test_api_seller_product_option_unit_list_success(
  connection: api.IConnection,
) {
  /**
   * Scenario: Verify a seller can successfully retrieve a paginated list of all
   * units/values for a product option group.
   *
   * This test covers the end-to-end seller workflow:
   *
   * 1. Seller account registration/authentication.
   * 2. Product creation under that seller.
   * 3. Creation of a product option group (e.g., 'Color').
   * 4. Addition of several option units to the option group (e.g., "Red", "Blue",
   *    "Green").
   * 5. Retrieve the paginated list of units; verify all units returned and
   *    structure/contents correct.
   * 6. Validate filtering by unit_value returns only matching units.
   * 7. Test pagination (limit/page) works as expected.
   * 8. Extra: check empty result on unmatched filter.
   */

  // Step 1: Register a new seller (and authenticate session context)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const businessRegNum = RandomGenerator.alphaNumeric(10);
  const sellerName = RandomGenerator.name();
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_registration_number: businessRegNum,
      name: sellerName,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerAuth);

  // Step 2: Create a new product
  const productInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.name(),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 4,
      sentenceMax: 8,
    }),
    product_type: "physical",
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: RandomGenerator.alphaNumeric(8),
    sort_priority: 10,
  };
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      {
        body: productInput,
      },
    );
  typia.assert(product);

  // Step 3: Create an option group (e.g., 'Color')
  const optionInput: IShoppingMallAiBackendProductOptions.ICreate = {
    option_name: "Color",
    required: true,
    sort_order: 1,
  };
  const optionGroup =
    await api.functional.shoppingMallAiBackend.seller.products.options.create(
      connection,
      {
        productId: product.id,
        body: optionInput,
      },
    );
  typia.assert(optionGroup);

  // Step 4: Add several units (option values) to this group
  const unitInputs: IShoppingMallAiBackendProductOptionUnit.ICreate[] = [
    {
      shopping_mall_ai_backend_product_options_id: optionGroup.id,
      unit_value: "Red",
      unit_code: "red01",
      sort_order: 1,
    },
    {
      shopping_mall_ai_backend_product_options_id: optionGroup.id,
      unit_value: "Blue",
      unit_code: "blue01",
      sort_order: 2,
    },
    {
      shopping_mall_ai_backend_product_options_id: optionGroup.id,
      unit_value: "Green",
      unit_code: "green01",
      sort_order: 3,
    },
  ];
  const createdUnits: IShoppingMallAiBackendProductOptionUnit[] = [];
  for (const unitBody of unitInputs) {
    const created =
      await api.functional.shoppingMallAiBackend.seller.products.options.units.create(
        connection,
        {
          productId: product.id,
          optionId: optionGroup.id,
          body: unitBody,
        },
      );
    typia.assert(created);
    createdUnits.push(created);
  }

  // Step 5: Retrieve all units (no filter)
  const pageResp =
    await api.functional.shoppingMallAiBackend.seller.products.options.units.index(
      connection,
      {
        productId: product.id,
        optionId: optionGroup.id,
        body: {},
      },
    );
  typia.assert(pageResp);
  TestValidator.equals(
    "number of units matches created count",
    pageResp.data.length,
    createdUnits.length,
  );
  for (const created of createdUnits) {
    TestValidator.predicate(
      `unit ${created.unit_value} is listed`,
      !!pageResp.data.find(
        (u) =>
          u.unit_code === created.unit_code &&
          u.unit_value === created.unit_value,
      ),
    );
  }

  // Step 6: Retrieve units filtered by unit_value
  const filterValue = unitInputs[1].unit_value;
  const filterResp =
    await api.functional.shoppingMallAiBackend.seller.products.options.units.index(
      connection,
      {
        productId: product.id,
        optionId: optionGroup.id,
        body: { unit_value: filterValue },
      },
    );
  typia.assert(filterResp);
  TestValidator.equals("filtered unit count is 1", filterResp.data.length, 1);
  TestValidator.equals(
    "filtered unit value matches",
    filterResp.data[0].unit_value,
    filterValue,
  );

  // Step 7: Test pagination (limit 2 per page)
  const paginatedResp =
    await api.functional.shoppingMallAiBackend.seller.products.options.units.index(
      connection,
      {
        productId: product.id,
        optionId: optionGroup.id,
        body: { page: 1, limit: 2 },
      },
    );
  typia.assert(paginatedResp);
  TestValidator.equals(
    "first page returns 2 units",
    paginatedResp.data.length,
    2,
  );
  TestValidator.predicate(
    "pagination record total >= unit count",
    paginatedResp.pagination.records >= createdUnits.length,
  );

  // Step 8: Empty filter returns no results
  const emptyFilterResp =
    await api.functional.shoppingMallAiBackend.seller.products.options.units.index(
      connection,
      {
        productId: product.id,
        optionId: optionGroup.id,
        body: { unit_value: "NotARealValue123" },
      },
    );
  typia.assert(emptyFilterResp);
  TestValidator.equals(
    "empty filter yields empty unit list",
    emptyFilterResp.data.length,
    0,
  );
}
