import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IPageIShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProduct";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_seller_product_catalog_search_success(
  connection: api.IConnection,
) {
  /**
   * E2E: Seller product catalog advanced search (filtering, pagination,
   * security)
   *
   * This test verifies:
   *
   * - Seller onboarding and authentication via /auth/seller/join
   * - Product creation with varied product_type, title, tax_code, and
   *   business_status
   * - Filtering by product_type, title substring, and tax_code returns only
   *   seller's matching products
   * - Pagination works: limit/page fields are honored, correct result count per
   *   page, and accurate pagination metadata
   * - Only the expected summary fields are visible and all belong to the
   *   logged-in seller
   * - No products from other sellers are visible under any circumstances
   *
   * Test Steps:
   *
   * 1. Create and authenticate new seller account (join)
   * 2. Create at least six products with diverse product_type, title,
   *    business_status, and tax_code values
   * 3. Filter products by product_type
   * 4. Filter products by title substring
   * 5. Filter products by tax_code
   * 6. Call with no filter (should return all own products)
   * 7. Validate pagination (multiple pages, correct data count and page meta)
   * 8. Confirm all items in each result are only products created by this seller
   *    (data ownership)
   * 9. Check all visible fields strictly follow the ISummary definition for
   *    security
   */

  // 1. Seller onboarding and authentication
  const sellerInput: IShoppingMallAiBackendSeller.ICreate = {
    email: `${RandomGenerator.alphabets(10)}@testbusiness.com`,
    business_registration_number: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  };
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.seller.id;

  // 2. Create products (covering varied types/titles/business_status/tax_code)
  const productTypes = [
    RandomGenerator.alphaNumeric(8),
    RandomGenerator.alphaNumeric(8),
    RandomGenerator.alphaNumeric(8),
  ];
  const taxCodes = [
    RandomGenerator.alphaNumeric(4),
    RandomGenerator.alphaNumeric(4),
    RandomGenerator.alphaNumeric(4),
  ];
  const businessStatuses = ["active", "draft", "paused"] as const;
  const products: IShoppingMallAiBackendProduct[] = [];
  for (let i = 0; i < 6; ++i) {
    const createBody: IShoppingMallAiBackendProduct.ICreate = {
      title: `Test Product ${i + 1} - ${RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 7 })}`,
      slug: `test-product-${i + 1}-${RandomGenerator.alphaNumeric(6)}`,
      description: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 6,
        sentenceMax: 20,
      }),
      product_type: productTypes[i % productTypes.length],
      business_status: businessStatuses[i % businessStatuses.length],
      min_order_quantity: 1,
      max_order_quantity: 3,
      tax_code: taxCodes[i % taxCodes.length],
      sort_priority: i + 1,
    };
    const product =
      await api.functional.shoppingMallAiBackend.seller.products.create(
        connection,
        { body: createBody },
      );
    typia.assert(product);
    products.push(product);
  }

  // 3. Filter by product_type
  const filterType = productTypes[1];
  const catalogByType =
    await api.functional.shoppingMallAiBackend.seller.products.index(
      connection,
      { body: { product_type: filterType, limit: 100 } },
    );
  typia.assert(catalogByType);
  TestValidator.predicate(
    "all results match filtered product_type",
    catalogByType.data.length > 0 &&
      catalogByType.data.every((prod) => prod.product_type === filterType),
  );
  TestValidator.predicate(
    "only this seller's products are in product_type filter results",
    catalogByType.data.every((prod) => products.some((p) => p.id === prod.id)),
  );

  // 4. Filter by title substring
  const filterTitleSubstring = products[4].title.substring(4, 15);
  const catalogByTitle =
    await api.functional.shoppingMallAiBackend.seller.products.index(
      connection,
      { body: { title: filterTitleSubstring, limit: 100 } },
    );
  typia.assert(catalogByTitle);
  TestValidator.predicate(
    "all results have title including filter substring",
    catalogByTitle.data.length > 0 &&
      catalogByTitle.data.every((prod) =>
        prod.title.includes(filterTitleSubstring),
      ),
  );
  TestValidator.predicate(
    "only this seller's products are in title filter results",
    catalogByTitle.data.every((prod) => products.some((p) => p.id === prod.id)),
  );

  // 5. Filter by tax_code
  const filterTaxCode = taxCodes[2];
  const catalogByTaxCode =
    await api.functional.shoppingMallAiBackend.seller.products.index(
      connection,
      { body: { tax_code: filterTaxCode, limit: 100 } },
    );
  typia.assert(catalogByTaxCode);
  TestValidator.predicate(
    "all results have correct tax_code",
    catalogByTaxCode.data.length > 0 &&
      catalogByTaxCode.data.every((prod) => prod.tax_code === filterTaxCode),
  );
  TestValidator.predicate(
    "only this seller's products are in tax_code filter results",
    catalogByTaxCode.data.every((prod) =>
      products.some((p) => p.id === prod.id),
    ),
  );

  // 6. No filter (all own products)
  const catalogAll =
    await api.functional.shoppingMallAiBackend.seller.products.index(
      connection,
      { body: { limit: 12 } },
    );
  typia.assert(catalogAll);
  TestValidator.equals(
    "all products returned = created count",
    catalogAll.data.length,
    products.length,
  );
  TestValidator.predicate(
    "all results belong to this seller (no filter)",
    catalogAll.data.every((prod) => products.some((p) => p.id === prod.id)),
  );

  // 7. Pagination test: ensure two pages & page meta
  const pageSize = 3;
  const catalogPage1 =
    await api.functional.shoppingMallAiBackend.seller.products.index(
      connection,
      { body: { limit: pageSize, page: 1 } },
    );
  typia.assert(catalogPage1);
  TestValidator.equals(
    "pagination: page1 limit",
    catalogPage1.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "pagination: page1 current",
    catalogPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "number of results for page 1",
    catalogPage1.data.length,
    pageSize,
  );

  const catalogPage2 =
    await api.functional.shoppingMallAiBackend.seller.products.index(
      connection,
      { body: { limit: pageSize, page: 2 } },
    );
  typia.assert(catalogPage2);
  TestValidator.equals(
    "pagination: page2 limit",
    catalogPage2.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "pagination: page2 current",
    catalogPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "number of results for page 2",
    catalogPage2.data.length,
    products.length - pageSize,
  );

  // 8. Field visibility and structure (ISummary compliance)
  const allResults = [
    ...catalogAll.data,
    ...catalogPage1.data,
    ...catalogPage2.data,
  ];
  for (const productSummary of allResults) {
    // Only boolean logic, never mix with falsy values or "".
    const allowed = [
      "id",
      "title",
      "slug",
      "product_type",
      "business_status",
      "tax_code",
      "min_order_quantity",
      "max_order_quantity",
      "created_at",
      "updated_at",
    ];
    const fieldsOk =
      typeof productSummary.id === "string" &&
      typeof productSummary.title === "string" &&
      typeof productSummary.slug === "string" &&
      typeof productSummary.product_type === "string" &&
      typeof productSummary.business_status === "string" &&
      typeof productSummary.tax_code === "string" &&
      typeof productSummary.min_order_quantity === "number" &&
      typeof productSummary.max_order_quantity === "number" &&
      typeof productSummary.created_at === "string" &&
      typeof productSummary.updated_at === "string" &&
      Object.keys(productSummary).every((key) => allowed.includes(key));
    TestValidator.predicate(
      "summary includes only allowed ISummary fields",
      fieldsOk,
    );
  }
}
