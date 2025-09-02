import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IPageIShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProduct";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_seller_product_catalog_access_restriction(
  connection: api.IConnection,
) {
  /**
   * Validate that sellers can only view their own product catalog and not
   * products belonging to other sellers.
   *
   * This test ensures strict enforcement of role-based access in product
   * management:
   *
   * 1. Seller A is onboarded and a unique product is created under their account.
   * 2. Seller B is onboarded and authenticated with a separate context.
   * 3. Seller B tries to search for products using a filter that should only match
   *    Seller A's product (e.g., unique title).
   * 4. Assert that Seller B cannot view Seller A's product—returned results should
   *    not contain Seller A's product.
   *
   * This test validates that business security around product visibility is
   * working as intended, and that seller isolation is guaranteed by backend
   * implementation.
   */

  // 1. Seller A onboarding and authentication
  const sellerA_email = `${RandomGenerator.alphabets(8)}@a-biz.com`;
  const sellerA: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerA_email,
        business_registration_number: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAiBackendSeller.ICreate,
    });
  typia.assert(sellerA);
  const sellerA_id = sellerA.seller.id;

  // 2. Seller A creates a unique product
  const uniqueTitle = `S_A_${RandomGenerator.alphabets(6)}_${Date.now()}`;
  const uniqueSlug = `s-a-${RandomGenerator.alphaNumeric(8)}-${Date.now()}`;
  const sellerA_product: IShoppingMallAiBackendProduct =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      {
        body: {
          title: uniqueTitle,
          slug: uniqueSlug,
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 12,
            wordMin: 3,
            wordMax: 8,
          }),
          product_type: RandomGenerator.pick([
            "physical",
            "digital",
            "service",
          ] as const),
          business_status: RandomGenerator.pick([
            "active",
            "draft",
            "paused",
          ] as const),
          min_order_quantity: 1,
          max_order_quantity: 10,
          tax_code: RandomGenerator.alphaNumeric(6),
          sort_priority: 0,
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(sellerA_product);

  // 3. Onboard Seller B with a different business identity
  const sellerB_email = `${RandomGenerator.alphabets(8)}@b-biz.com`;
  const sellerB: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerB_email,
        business_registration_number: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAiBackendSeller.ICreate,
    });
  typia.assert(sellerB);
  const sellerB_id = sellerB.seller.id;

  // 4. Seller B attempts to search for Seller A's unique product by title filter
  const searchResponse: IPageIShoppingMallAiBackendProduct.ISummary =
    await api.functional.shoppingMallAiBackend.seller.products.index(
      connection,
      {
        body: {
          title: uniqueTitle,
          // Other fields left blank to focus the search specifically on title
        } satisfies IShoppingMallAiBackendProduct.IRequest,
      },
    );
  typia.assert(searchResponse);

  // Validate that none of the returned product summaries belong to Seller A, and the unique product from Seller A is inaccessible
  const found = searchResponse.data.find(
    (p) => p.title === uniqueTitle && p.slug === uniqueSlug,
  );
  TestValidator.equals(
    "Seller B cannot view Seller A's unique product",
    found,
    undefined,
  );

  // Optionally, verify that all returned products (if any) are not Seller A's product
  if (searchResponse.data.length > 0) {
    for (const prod of searchResponse.data) {
      TestValidator.notEquals(
        "Returned product is not Seller A's product",
        prod.title,
        uniqueTitle,
      );
      TestValidator.notEquals(
        "Returned product slug is not Seller A's slug",
        prod.slug,
        uniqueSlug,
      );
    }
  }
}
