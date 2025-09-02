import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";

export async function test_api_admin_product_file_soft_delete_already_deleted_file(
  connection: api.IConnection,
) {
  /**
   * Validates idempotency for soft-deleting a product file.
   *
   * This test ensures that the admin can safely soft delete a file attached to
   * a product more than once, and that repeating this request on an
   * already-deleted file produces an idempotent and safe system response (no
   * exception, no corruption, and no further effect). Steps:
   *
   * 1. Register and authenticate an admin account
   * 2. Create a product as admin
   * 3. Attach a file to the product, producing the fileId
   * 4. First soft-delete request for the file (should succeed—sets deleted_at)
   * 5. Second soft-delete request for the same file (should be idempotent—no
   *    error/exception/corruption)
   *
   * The test passes if both delete requests return cleanly (no exception) and
   * the second does not produce error or alter file state further, as no data
   * or status is returned on delete. This validates API idempotency.
   */

  // 1. Register and authenticate admin
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(8),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(5)}@test-ai-e2e.com`,
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: adminCredentials,
  });
  typia.assert(adminJoin);

  // 2. Create product
  const productInput = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(10),
    product_type: RandomGenerator.pick(["physical", "digital"] as const),
    business_status: RandomGenerator.pick([
      "active",
      "draft",
      "paused",
    ] as const),
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: RandomGenerator.alphaNumeric(6),
    sort_priority: 0,
    // description is optional
  } satisfies IShoppingMallAiBackendProduct.ICreate;
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: productInput,
      },
    );
  typia.assert(product);

  // 3. Attach file to product
  const fileInput = {
    shopping_mall_ai_backend_products_id: product.id,
    file_uri: `https://cdn-e2e-test.com/product/${product.id}/${RandomGenerator.alphaNumeric(12)}`,
    file_type: RandomGenerator.pick([
      "image/jpeg",
      "image/png",
      "application/pdf",
    ] as const),
    display_order: 0,
    is_primary: true,
  } satisfies IShoppingMallAiBackendProductFile.ICreate;
  const file =
    await api.functional.shoppingMallAiBackend.admin.products.files.create(
      connection,
      {
        productId: product.id,
        body: fileInput,
      },
    );
  typia.assert(file);

  // 4. First soft-delete (should succeed, set deleted_at)
  await api.functional.shoppingMallAiBackend.admin.products.files.erase(
    connection,
    {
      productId: product.id,
      fileId: file.id,
    },
  );

  // 5. Second soft-delete (should be idempotent: not error, not corrupt)
  await api.functional.shoppingMallAiBackend.admin.products.files.erase(
    connection,
    {
      productId: product.id,
      fileId: file.id,
    },
  );
}
