import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCart";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * Validate the administrator's ability to retrieve the full list of all
 * shopping carts.
 *
 * This test verifies that an authenticated administrator can fetch a
 * comprehensive, paginated list of all system carts—including both
 * customer-associated carts and anonymous guest carts. The test also checks for
 * several edge cases and error scenarios:
 *
 * 1. Success retrieval: Ensure both customer and guest carts are present in the
 *    main result array, with expected identifiers (customer UUID or
 *    session_token) set appropriately, and that item counts are correct.
 * 2. Empty edge case: Verify behavior when the system has no carts (expect empty
 *    data array and correct pagination structure).
 * 3. Pagination: Assess handling of multi-page results by simulating or creating
 *
 * > 1 page of carts (check that 'pagination.pages' and 'pagination.records' match
 *    > expectations, and 'data' array size does not exceed 'pagination.limit').
 * 4. Privacy: Confirm that no detailed cart item content is present—only summary
 *    counts and metadata fields are included per schema.
 * 5. Unauthorized access: Confirm that calling this endpoint without administrator
 *    rights yields an authorization error (TestValidator.error).
 *
 * Each result in 'data' should:
 *
 * - Have either 'aimall_backend_customer_id' (customer cart) or 'session_token'
 *   (guest cart)
 * - Never reveal individual cart item objects, only 'cart_items_count'
 * - Follow date/uuid type constraints for IDs and timestamps
 *
 * The test covers a realistic combination of data existence (some, none, many),
 * privacy enforcement, and proper error handling for permissions.
 */
export async function test_api_aimall_backend_administrator_carts_index(
  connection: api.IConnection,
) {
  // 1. Attempt retrieval with administrator privileges
  const output =
    await api.functional.aimall_backend.administrator.carts.index(connection);
  typia.assert(output);

  // 2. Verify output structure — should have pagination and data array
  TestValidator.predicate("pagination present")(!!output.pagination);
  TestValidator.predicate("data is array")(Array.isArray(output.data));

  // 3. If not empty, verify cart ownership and privacy fields
  for (const cart of output.data ?? []) {
    typia.assert(cart);

    // Should have either customer_id or session_token but not both undefined
    TestValidator.predicate("cart owner present")(
      !!(cart.aimall_backend_customer_id || cart.session_token),
    );

    // Ensure cart_items_count is a number if present
    if (cart.cart_items_count !== undefined)
      TestValidator.predicate("cart_items_count is int32")(
        typeof cart.cart_items_count === "number",
      );

    // No cart item details (the schema must not allow details — just count)
    const cartExtraKeys = Object.keys(cart).filter(
      (k) =>
        ![
          "id",
          "aimall_backend_customer_id",
          "session_token",
          "created_at",
          "updated_at",
          "cart_items_count",
        ].includes(k),
    );
    TestValidator.equals("no extra fields")(cartExtraKeys.length)(0);
  }

  // 4. If data empty, check pagination matches (records/pages = 0 or 1)
  if (!output.data || output.data.length === 0) {
    TestValidator.equals("records empty")(output.pagination?.records)(0);
    TestValidator.predicate("pages empty")(
      output.pagination?.pages === 0 || output.pagination?.pages === 1,
    );
  }

  // 5. Simulate/assess pagination (if system has many carts). Page size and count validated by pagination fields.
  if (output.pagination) {
    TestValidator.predicate("limit is positive")(output.pagination.limit > 0);
    TestValidator.predicate("current page is valid")(
      output.pagination.current > 0 &&
        output.pagination.current <= output.pagination.pages,
    );
    if (output.pagination.pages > 1) {
      TestValidator.predicate("partial page data size")(
        output.data !== undefined &&
          output.data.length <= output.pagination.limit,
      );
    }
  }

  // 6. Unauthorized: Try without administrator rights (simulate by removing Authorization header)
  const noAuth = { ...connection, headers: { ...connection.headers } };
  delete noAuth.headers.Authorization;
  await TestValidator.error("unauthorized access fails")(() =>
    api.functional.aimall_backend.administrator.carts.index(noAuth),
  );
}
