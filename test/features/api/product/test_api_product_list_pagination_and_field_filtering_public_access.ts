import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IPageIShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProduct";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test public product catalog search with pagination and field filters.
 *
 * - Verifies unauthenticated product search endpoint with various pagination
 *   and filtering options.
 * - Ensures only public (not soft-deleted/hidden) products are returned.
 * - Validates error handling for invalid parameters (e.g., excessive limits,
 *   negative values).
 * - Covers multiple filter scenarios, edge cases, and business rules.
 */
export async function test_api_product_list_pagination_and_field_filtering_public_access(
  connection: api.IConnection,
) {
  // 1. Basic pagination: page 1, limit 5
  const paged = await api.functional.shoppingMallAiBackend.products.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallAiBackendProduct.IRequest,
    },
  );
  typia.assert(paged);
  TestValidator.equals("page 1 returned", paged.pagination.current, 1);
  TestValidator.equals("limit is 5", paged.pagination.limit, 5);
  TestValidator.predicate(
    "only public products in page 1",
    paged.data.every(
      (p) => p.deleted_at === null || p.deleted_at === undefined,
    ),
  );

  // 2. Filtering by business_status
  if (paged.data.length > 0) {
    const status = paged.data[0].business_status;
    const filtered = await api.functional.shoppingMallAiBackend.products.index(
      connection,
      {
        body: {
          business_status: status,
          limit: 3,
        } satisfies IShoppingMallAiBackendProduct.IRequest,
      },
    );
    typia.assert(filtered);
    TestValidator.predicate(
      "filter by business_status filters results",
      filtered.data.every(
        (p) =>
          p.business_status === status &&
          (p.deleted_at === null || p.deleted_at === undefined),
      ),
    );
  }

  // 3. Filtering by product_type
  if (paged.data.length > 0) {
    const type = paged.data[0].product_type;
    const byType = await api.functional.shoppingMallAiBackend.products.index(
      connection,
      {
        body: {
          product_type: type,
        } satisfies IShoppingMallAiBackendProduct.IRequest,
      },
    );
    typia.assert(byType);
    TestValidator.predicate(
      "filter by product_type filters results",
      byType.data.every(
        (p) =>
          p.product_type === type &&
          (p.deleted_at === null || p.deleted_at === undefined),
      ),
    );
  }

  // 4. Filtering by both business_status and product_type
  if (paged.data.length > 0) {
    const { business_status, product_type } = paged.data[0];
    const both = await api.functional.shoppingMallAiBackend.products.index(
      connection,
      {
        body: {
          business_status,
          product_type,
        } satisfies IShoppingMallAiBackendProduct.IRequest,
      },
    );
    typia.assert(both);
    TestValidator.predicate(
      "combined filter: status & type filters results",
      both.data.every(
        (p) =>
          p.business_status === business_status &&
          p.product_type === product_type &&
          (p.deleted_at === null || p.deleted_at === undefined),
      ),
    );
  }

  // 5. Excessive page size (should error)
  await TestValidator.error("limit > 100 should error", async () => {
    await api.functional.shoppingMallAiBackend.products.index(connection, {
      body: { limit: 9999 } satisfies IShoppingMallAiBackendProduct.IRequest,
    });
  });

  // 6. Negative value for page (should error)
  await TestValidator.error("negative page should error", async () => {
    await api.functional.shoppingMallAiBackend.products.index(connection, {
      body: { page: -1 } satisfies IShoppingMallAiBackendProduct.IRequest,
    });
  });

  // 7. Negative value for limit (should error)
  await TestValidator.error("negative limit should error", async () => {
    await api.functional.shoppingMallAiBackend.products.index(connection, {
      body: { limit: -5 } satisfies IShoppingMallAiBackendProduct.IRequest,
    });
  });

  // 8. Out-of-range page number: likely no results
  const noResult = await api.functional.shoppingMallAiBackend.products.index(
    connection,
    {
      body: {
        page: 99999,
        limit: 5,
      } satisfies IShoppingMallAiBackendProduct.IRequest,
    },
  );
  typia.assert(noResult);
  TestValidator.equals(
    "no results for out-of-range page",
    noResult.data.length,
    0,
  );
}
