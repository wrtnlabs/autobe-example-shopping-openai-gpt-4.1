import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * Validate that the AIMall Backend product creation API correctly rejects
 * attempts to create a product using invalid or non-existent foreign keys for
 * required relations (`category_id` and `seller_id`).
 *
 * This test tries to create a product by explicitly supplying UUIDs for
 * `category_id` and `seller_id` that are assumed not to exist in the system.
 * The expectation is that the API should return a validation error response
 * indicating a violation of foreign key constraints or similar relationship
 * integrity checks.
 *
 * Steps:
 *
 * 1. Construct a product creation body with
 *
 *    - Random UUID for `category_id` (not linked to a real category)
 *    - Random UUID for `seller_id` (not linked to a real seller)
 *    - Fill out all other required fields with valid/random data.
 * 2. Attempt to create the product via the endpoint.
 * 3. Validate that an error is thrown (TestValidator.error), and that the error is
 *    due to the invalid foreign keys, confirming relationship integrity is
 *    enforced.
 */
export async function test_api_aimall_backend_test_create_product_with_invalid_foreign_keys(
  connection: api.IConnection,
) {
  // 1. Construct product creation input with intentionally invalid foreign keys
  const invalidProduct = {
    category_id: typia.random<string & tags.Format<"uuid">>(), // presumed non-existent
    seller_id: typia.random<string & tags.Format<"uuid">>(), // presumed non-existent
    title: "Test Invalid Product",
    description:
      "Test product should not be created due to bad category/seller.",
    status: "active",
  } satisfies IAimallBackendProduct.ICreate;

  // 2. Attempt to create and ensure error due to FK violation
  await TestValidator.error("should reject product with invalid foreign keys")(
    async () => {
      await api.functional.aimall_backend.seller.products.create(connection, {
        body: invalidProduct,
      });
    },
  );
}
