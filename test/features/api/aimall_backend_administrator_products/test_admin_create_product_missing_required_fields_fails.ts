import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * Validate that product creation fails with missing required fields.
 *
 * This test ensures that the product creation endpoint enforces required field
 * validation by attempting to create a product with one or more missing
 * required fields (e.g., omitting title or category_id). The test verifies that
 * the API returns a validation error and does not create a new product record
 * when required data is missing, by passing empty strings for required
 * properties (since TypeScript prevents true omission of required fields).
 *
 * Steps:
 *
 * 1. Attempt to create a product with an empty title (instead of omitting
 *    'title').
 * 2. Attempt to create a product with an empty category_id.
 * 3. Attempt to create a product with an empty seller_id.
 * 4. Attempt to create a product with an empty status value.
 * 5. Assert that each case produces an API validation error and does NOT create a
 *    product.
 * 6. Only runtime business logic errors are validated (not compile-time typing
 *    issues).
 */
export async function test_api_aimall_backend_administrator_products_test_admin_create_product_missing_required_fields_fails(
  connection: api.IConnection,
) {
  // 1. Attempt to create a product with an empty title (invalid)
  await TestValidator.error("missing product title should fail")(() =>
    api.functional.aimall_backend.administrator.products.create(connection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        title: "", // Intentionally blank for negative test
        status: "active",
      },
    }),
  );

  // 2. Attempt to create a product with an empty category_id (invalid)
  await TestValidator.error("missing category_id should fail")(() =>
    api.functional.aimall_backend.administrator.products.create(connection, {
      body: {
        category_id: "", // Intentionally blank for negative test
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Valid Product Title",
        status: "active",
      },
    }),
  );

  // 3. Attempt to create a product with an empty seller_id (invalid)
  await TestValidator.error("missing seller_id should fail")(() =>
    api.functional.aimall_backend.administrator.products.create(connection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: "", // Intentionally blank for negative test
        title: "Valid Product Title",
        status: "active",
      },
    }),
  );

  // 4. Attempt to create a product with an empty status value (invalid)
  await TestValidator.error("missing status should fail")(() =>
    api.functional.aimall_backend.administrator.products.create(connection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Valid Product Title",
        status: "", // Intentionally blank for negative test
      },
    }),
  );
}
