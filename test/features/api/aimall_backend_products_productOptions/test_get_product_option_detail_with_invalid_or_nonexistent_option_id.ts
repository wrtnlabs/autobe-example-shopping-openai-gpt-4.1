import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductOption";

/**
 * Validate retrieval of a product option by an invalid or non-existent option
 * ID.
 *
 * This test ensures the API correctly rejects requests for product options that
 * do not exist or use invalidly-formatted IDs.
 *
 * Steps:
 *
 * 1. Create a new product to use as the reference parent.
 * 2. Attempt to retrieve a product option with a valid but nonexistent UUID,
 *    expecting a 404 or not found error.
 * 3. Attempt to retrieve a product option with a badly formatted (invalid) UUID,
 *    expecting a validation error.
 */
export async function test_api_aimall_backend_products_productOptions_test_get_product_option_detail_with_invalid_or_nonexistent_option_id(
  connection: api.IConnection,
) {
  // 1. Create a new product as the parent context for negative tests
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph()(),
          status: "active",
          description: RandomGenerator.content()()(),
          // main_thumbnail_uri is omitted (optional and must not be null)
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Try to retrieve a product option with a valid-form UUID that does not exist
  const nonExistentOptionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("404 for nonexistent product option")(() =>
    api.functional.aimall_backend.products.productOptions.at(connection, {
      productId: product.id,
      productOptionId: nonExistentOptionId,
    }),
  );

  // 3. Try to retrieve a product option with an invalid UUID format
  const invalidOptionId = "not-a-valid-uuid";
  await TestValidator.error("invalid UUID format for productOptionId")(() =>
    api.functional.aimall_backend.products.productOptions.at(connection, {
      productId: product.id,
      productOptionId: invalidOptionId as string & tags.Format<"uuid">,
    }),
  );
}
