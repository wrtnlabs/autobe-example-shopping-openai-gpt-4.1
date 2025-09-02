import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";

export async function test_api_product_file_update_admin_file_not_found(
  connection: api.IConnection,
) {
  /**
   * Test admin file update with a fileId that does not exist for the product.
   *
   * This scenario ensures that when an authenticated admin tries to update the
   * metadata of a non-existent file for a real product, the endpoint correctly
   * responds with a not found error (404 or equivalent). It helps verify robust
   * error handling for invalid fileId references.
   *
   * Steps:
   *
   * 1. Register and authenticate a new admin (ensures Authorization header is
   *    present).
   * 2. Create a new product to generate a valid productId.
   * 3. Pick a random (but well-formed) fake UUID for fileId—that is not attached
   *    to this product.
   * 4. Call PUT /shoppingMallAiBackend/admin/products/{productId}/files/{fileId}
   *    with plausible update data.
   * 5. Use TestValidator.error to check that an error is thrown (indicating the
   *    API properly rejects not-found fileId).
   */

  // 1. Register admin
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.name(2).replace(/\s/g, "")}@test.local`,
      phone_number: null,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Create product
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: {
          title: RandomGenerator.name(3),
          slug: RandomGenerator.alphaNumeric(14),
          description: RandomGenerator.paragraph(),
          product_type: RandomGenerator.pick([
            "physical",
            "digital",
            "service",
          ] as const),
          business_status: RandomGenerator.pick([
            "draft",
            "active",
            "paused",
          ] as const),
          min_order_quantity: 1,
          max_order_quantity: 50,
          tax_code: "DEFAULT",
          sort_priority: 1,
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Attempt to update a non-existent fileId for this product
  const fakeFileId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    file_uri: "https://cdn.example.com/nonexistent-file.jpg",
    file_type: "image/jpeg",
    display_order: 1,
    is_primary: false,
    deleted_at: null,
  } satisfies IShoppingMallAiBackendProductFile.IUpdate;

  await TestValidator.error(
    "should return not found error when updating non-existent fileId",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.files.update(
        connection,
        {
          productId: product.id,
          fileId: fakeFileId,
          body: updateBody,
        },
      );
    },
  );
}
