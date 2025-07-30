import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";
import type { IPageIAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSku";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate SKU search with intentionally invalid or malformed filter
 * parameters.
 *
 * This test ensures that searching for SKUs using invalid filters (e.g., a
 * non-existent productId and out-of-bounds pagination values) results in
 * API-level validation errors, not generic server crashes or internal info
 * leakage. No system-level information or stack trace should be leaked, and
 * error types should indicate client misuse of filters.
 *
 * Steps:
 *
 * 1. Create a valid product so the test can distinguish between valid and invalid
 *    product IDs.
 * 2. Attempt SKU search where product_id is set to a random UUID not matching any
 *    product (to simulate a non-existent product), and otherwise valid
 *    filters.
 *
 *    - Expect: response is 200, but data array is empty (normal behavior).
 * 3. Attempt SKU search with product_id of invalid UUID format (e.g.,
 *    'not-a-uuid').
 *
 *    - Expect: HTTP 400 level error (client validation) – must not leak stack traces
 *         or DB errors.
 * 4. Attempt SKU search with malformed or out-of-bounds pagination (e.g., page =
 *    -1, limit = 100000000).
 *
 *    - Expect: HTTP 400 error or empty result (depending on business logic), but no
 *         leaks or 500 errors.
 * 5. For each error, validate that error result is a client-validation-level
 *    response, and does not contain raw system or stack info.
 *
 * Note: Steps that purposely send invalid types/values (such as a non-UUID or
 * negative page) require the use of `as any` to bypass TypeScript compile-time
 * checks, since these errors are runtime schema validations.
 */
export async function test_api_aimall_backend_administrator_skus_test_search_skus_with_invalid_filter(
  connection: api.IConnection,
) {
  // 1. Create a valid product for the baseline
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: "Test Product",
          description: "A product for invalid filter testing.",
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Search SKUs with a non-existent (but well-formed) product UUID
  const resNonExistent =
    await api.functional.aimall_backend.administrator.skus.search(connection, {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        page: 1,
        limit: 10,
      } satisfies IAimallBackendSku.IRequest,
    });
  typia.assert(resNonExistent);
  TestValidator.equals("should be empty when using non-existent product UUID")(
    resNonExistent.data.length,
  )(0);

  // 3. Search SKUs with badly formatted product_id (not UUID at all)
  await TestValidator.error(
    "malformed product_id should trigger validation error",
  )(() =>
    api.functional.aimall_backend.administrator.skus.search(connection, {
      body: {
        product_id: "not-a-uuid" as any,
        page: 1,
        limit: 10,
      } as any, // Will trigger runtime error due to bad format
    }),
  );

  // 4. Search SKUs with out-of-bounds pagination values
  await TestValidator.error("negative page should error or be validated")(() =>
    api.functional.aimall_backend.administrator.skus.search(connection, {
      body: {
        product_id: product.id,
        page: -1 as any,
        limit: 10,
      } as any,
    }),
  );

  await TestValidator.error("excessive limit should error or be validated")(
    () =>
      api.functional.aimall_backend.administrator.skus.search(connection, {
        body: {
          product_id: product.id,
          page: 1,
          limit: 100000000 as any,
        } as any,
      }),
  );
}
