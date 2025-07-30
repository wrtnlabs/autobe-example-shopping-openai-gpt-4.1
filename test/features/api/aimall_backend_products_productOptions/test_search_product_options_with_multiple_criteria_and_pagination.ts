import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductOption";
import type { IPageIAimallBackendProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendProductOption";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Advanced search, filtering, and pagination for product options of a product.
 *
 * Tests:
 *
 * 1. Create a test product (as admin)
 * 2. Add several product options: 'Color: Red', 'Color: Blue', 'Size: Large',
 *    'Size: Medium', 'Material: Cotton'
 * 3. Search: name = 'Color', value = 'Red' → expect only 'Color: Red'
 * 4. Search: name = 'Size' → expect both size options
 * 5. Search with pagination (limit = 1, page = 2) → check the correct nth option
 *    is returned
 * 6. Search with filter yielding no match, expect empty results
 * 7. Search with partial value match (e.g., value = 'ue') to see if API supports
 *    substring/partial matching
 * 8. Assert that all returned options have the correct product_id and field type
 * 9. Invalid productId (UUID not used): expect error or empty array per API
 * 10. Invalid filter type (page as string): expect validation error
 */
export async function test_api_aimall_backend_products_productOptions_test_search_product_options_with_multiple_criteria_and_pagination(
  connection: api.IConnection,
) {
  // 1. Create a test product as admin
  const testProduct =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: `Test Product ${RandomGenerator.alphaNumeric(6)}`,
          description: "A product for option search e2e test.",
          main_thumbnail_uri: undefined,
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(testProduct);

  // 2. Create multiple known product options
  const options = [
    { name: "Color", value: "Red" },
    { name: "Color", value: "Blue" },
    { name: "Size", value: "Large" },
    { name: "Size", value: "Medium" },
    { name: "Material", value: "Cotton" },
  ];
  const createdOptions: IAimallBackendProductOption[] = [];
  for (const { name, value } of options) {
    const created =
      await api.functional.aimall_backend.administrator.products.productOptions.create(
        connection,
        {
          productId: testProduct.id,
          body: {
            product_id: testProduct.id,
            name,
            value,
          } satisfies IAimallBackendProductOption.ICreate,
        },
      );
    typia.assert(created);
    TestValidator.equals("product_id matches")(created.product_id)(
      testProduct.id,
    );
    TestValidator.equals("name matches")(created.name)(name);
    TestValidator.equals("value matches")(created.value)(value);
    createdOptions.push(created);
  }

  // 3. Search for Color: Red
  const colorRedRes =
    await api.functional.aimall_backend.products.productOptions.search(
      connection,
      {
        productId: testProduct.id,
        body: {
          product_id: testProduct.id,
          name: "Color",
          value: "Red",
        } satisfies IAimallBackendProductOption.IRequest,
      },
    );
  typia.assert(colorRedRes);
  TestValidator.equals("only one result")(colorRedRes.data.length)(1);
  if (colorRedRes.data.length > 0) {
    const colorRed = colorRedRes.data[0];
    TestValidator.equals("product_id")(colorRed.product_id)(testProduct.id);
    TestValidator.equals("name")(colorRed.name)("Color");
    TestValidator.equals("value")(colorRed.value)("Red");
  }

  // 4. Search for only Size options
  const sizeSearch =
    await api.functional.aimall_backend.products.productOptions.search(
      connection,
      {
        productId: testProduct.id,
        body: {
          product_id: testProduct.id,
          name: "Size",
        } satisfies IAimallBackendProductOption.IRequest,
      },
    );
  typia.assert(sizeSearch);
  const sizeOptions = createdOptions.filter((o) => o.name === "Size");
  TestValidator.equals("size results count")(sizeSearch.data.length)(
    sizeOptions.length,
  );
  for (const opt of sizeSearch.data) {
    TestValidator.equals("product_id")(opt.product_id)(testProduct.id);
    TestValidator.equals("name")(opt.name)("Size");
    TestValidator.predicate("value is Large or Medium")(
      opt.value === "Large" || opt.value === "Medium",
    );
  }

  // 5. Pagination: limit 1, page 2
  const paginated =
    await api.functional.aimall_backend.products.productOptions.search(
      connection,
      {
        productId: testProduct.id,
        body: {
          product_id: testProduct.id,
          limit: 1,
          page: 2,
        } satisfies IAimallBackendProductOption.IRequest,
      },
    );
  typia.assert(paginated);
  TestValidator.equals("page meta")(paginated.pagination.current)(2);
  TestValidator.equals("limit meta")(paginated.pagination.limit)(1);
  TestValidator.equals("paginated data count")(paginated.data.length)(1);
  if (paginated.data.length > 0) {
    // Should be the second inserted option
    const expected = createdOptions[1];
    TestValidator.equals("paginated 2nd option")(paginated.data[0].id)(
      expected.id,
    );
  }

  // 6. Search with filter that yields no result (name = 'Nonexistent')
  const emptyRes =
    await api.functional.aimall_backend.products.productOptions.search(
      connection,
      {
        productId: testProduct.id,
        body: {
          product_id: testProduct.id,
          name: "Nonexistent",
        } satisfies IAimallBackendProductOption.IRequest,
      },
    );
  typia.assert(emptyRes);
  TestValidator.equals("no results")(emptyRes.data.length)(0);

  // 7. Search for partial match (value: 'ue' - e.g., should match 'Blue' if partials are supported)
  // If backend supports partials, this should match 'Color: Blue', otherwise will be strict match only
  const partialRes =
    await api.functional.aimall_backend.products.productOptions.search(
      connection,
      {
        productId: testProduct.id,
        body: {
          product_id: testProduct.id,
          value: "ue",
        } satisfies IAimallBackendProductOption.IRequest,
      },
    );
  typia.assert(partialRes);
  // Accept either 1 (if partial match supported, only 'Blue') or 0 if strict match
  TestValidator.predicate("partial match 1 or 0")(
    partialRes.data.length === 1 || partialRes.data.length === 0,
  );
  if (partialRes.data.length === 1) {
    TestValidator.equals("partial result matches Blue")(
      partialRes.data[0].name,
    )("Color");
    TestValidator.equals("partial result value is Blue")(
      partialRes.data[0].value,
    )("Blue");
    TestValidator.equals("product_id")(partialRes.data[0].product_id)(
      testProduct.id,
    );
  }

  // 8. All returned options should have correct product_id (also checked per step)

  // 9. Invalid productId (random UUID not used for any product): expect empty or error
  const invalidProductId = typia.random<string & tags.Format<"uuid">>();
  const invalidIdRes =
    await api.functional.aimall_backend.products.productOptions.search(
      connection,
      {
        productId: invalidProductId,
        body: {
          product_id: invalidProductId,
        } satisfies IAimallBackendProductOption.IRequest,
      },
    );
  typia.assert(invalidIdRes);
  // Accept either empty data (API: soft not found) or error elsewhere; if implementation throws, would fail before here
  TestValidator.predicate("invalid id returns empty")(
    invalidIdRes.data.length === 0,
  );

  // 10. Invalid filter types (page as string) should throw validation error
  await TestValidator.error("invalid filter type (page as string)")(
    async () => {
      await api.functional.aimall_backend.products.productOptions.search(
        connection,
        {
          productId: testProduct.id,
          body: {
            product_id: testProduct.id,
            page: "not_a_number" as any,
          } as any, // purposely breaking type for API boundary check
        },
      );
    },
  );
}
