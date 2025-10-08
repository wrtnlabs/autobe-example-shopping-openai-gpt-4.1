import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductOptionValue";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";

/**
 * Validate admin listing of product option values (e.g., color variants).
 *
 * 1. Register admin account and authenticate
 * 2. Create a category
 * 3. Create a product referencing the category
 * 4. Create a product option (e.g., Color)
 * 5. Add multiple option values (Red, Blue, Green)
 * 6. List all values for the option (verify all present)
 * 7. Test pagination (limit=2)
 * 8. Filter by substring ('e')
 * 9. Sort by display_order ascending/descending
 */
export async function test_api_admin_list_product_option_values_success(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(admin);

  // 2. Create category
  const categoryInput = {
    name_ko: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 2,
      wordMax: 8,
    }),
    name_en: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 2,
      wordMax: 8,
    }),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryInput },
  );
  typia.assert(category);

  // 3. Create product assigned to the admin's account as seller (id = admin.id)
  const productInput = {
    shopping_mall_seller_id: admin.id,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.name(),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 4. Create product option (e.g., Color)
  const optionInput = {
    name: "Color",
    display_order: 0,
  } satisfies IShoppingMallProductOption.ICreate;
  const option =
    await api.functional.shoppingMall.admin.products.options.create(
      connection,
      {
        productId: product.id,
        body: optionInput,
      },
    );
  typia.assert(option);

  // 5. Add option values (Red, Blue, Green)
  const valueNames = ["Red", "Blue", "Green"] as const;
  const values = await ArrayUtil.asyncMap(valueNames, async (value, idx) => {
    const valueInput = {
      value,
      display_order: idx,
    } satisfies IShoppingMallProductOptionValue.ICreate;
    const created =
      await api.functional.shoppingMall.admin.products.options.values.create(
        connection,
        {
          productId: product.id,
          optionId: option.id,
          body: valueInput,
        },
      );
    typia.assert(created);
    return created;
  });

  // 6. List all values, verify presence and correct data
  const indexAll =
    await api.functional.shoppingMall.admin.products.options.values.index(
      connection,
      {
        productId: product.id,
        optionId: option.id,
        body: {},
      },
    );
  typia.assert(indexAll);
  TestValidator.equals(
    "all created values present",
    indexAll.data.length,
    valueNames.length,
  );
  valueNames.forEach((name) => {
    TestValidator.predicate(
      `option value ${name} exists`,
      indexAll.data.some((v) => v.value === name),
    );
  });
  // Check display_order sorted ascending
  const sortedAsc = [...indexAll.data].sort(
    (a, b) => a.display_order - b.display_order,
  );
  TestValidator.equals(
    "values sorted ascending by default",
    indexAll.data,
    sortedAsc,
  );

  // 7. Test pagination (limit = 2)
  const indexPage =
    await api.functional.shoppingMall.admin.products.options.values.index(
      connection,
      {
        productId: product.id,
        optionId: option.id,
        body: { page: 1, limit: 2 },
      },
    );
  typia.assert(indexPage);
  TestValidator.equals(
    "pagination returns limited results",
    indexPage.data.length,
    2,
  );
  TestValidator.equals(
    "pagination page number",
    indexPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", indexPage.pagination.limit, 2);
  // 8. Filter by substring ('e')
  const filterVal = "e";
  const indexFiltered =
    await api.functional.shoppingMall.admin.products.options.values.index(
      connection,
      {
        productId: product.id,
        optionId: option.id,
        body: { value: filterVal },
      },
    );
  typia.assert(indexFiltered);
  TestValidator.predicate(
    "all values contain filtered substring",
    indexFiltered.data.every((v) => v.value.toLowerCase().includes(filterVal)),
  );
  TestValidator.predicate(
    "some values have filtered substring",
    indexFiltered.data.length > 0,
  );

  // 9. Sort by display_order descending
  const indexDesc =
    await api.functional.shoppingMall.admin.products.options.values.index(
      connection,
      {
        productId: product.id,
        optionId: option.id,
        body: { sort_by: "display_order", order: "desc" },
      },
    );
  typia.assert(indexDesc);
  const descSorted = [...indexDesc.data].sort(
    (a, b) => b.display_order - a.display_order,
  );
  TestValidator.equals(
    "descending sort by display_order",
    indexDesc.data,
    descSorted,
  );
}
