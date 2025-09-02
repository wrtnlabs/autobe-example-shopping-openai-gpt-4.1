import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";

/**
 * Test admin-side update of product file metadata.
 *
 * 1. Admin joins and is authenticated (receiving tokens).
 * 2. Admin creates a new product.
 * 3. Admin attaches a file to the newly created product.
 * 4. Admin updates the file metadata (is_primary=true, display_order,
 *    file_type) via update endpoint.
 * 5. Verify the update response reflects the new values and static fields are
 *    unchanged.
 *
 * Notes:
 *
 * - The update operation returns the new file object; its fields are compared
 *   against the update input.
 * - The unchanged fields (id, product id, file_uri) are also compared for
 *   integrity.
 * - All random data, including uuids and emails, follows strict format
 *   constraints.
 * - This test is critical for business flows where product media curation is
 *   required by platform admins or moderators.
 */
export async function test_api_product_file_update_admin_success(
  connection: api.IConnection,
) {
  // 1. Admin joins and is authenticated
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      password_hash: RandomGenerator.alphaNumeric(32), // hash-format (simulate for test)
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(10)}@company.com`,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);
  const admin = adminJoin.admin;

  // 2. Admin creates a new product
  const productCreate =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 10,
          }),
          slug: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 12,
          }),
          product_type: "physical",
          business_status: "active",
          min_order_quantity: 1,
          max_order_quantity: 77,
          tax_code: "010",
          sort_priority: 1,
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(productCreate);

  // 3. Admin attaches a file
  const fileCreate =
    await api.functional.shoppingMallAiBackend.admin.products.files.create(
      connection,
      {
        productId: productCreate.id,
        body: {
          shopping_mall_ai_backend_products_id: productCreate.id,
          file_uri: `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}.jpg`,
          file_type: "image/jpeg",
          display_order: 1,
          is_primary: false,
        } satisfies IShoppingMallAiBackendProductFile.ICreate,
      },
    );
  typia.assert(fileCreate);

  // 4. Admin updates the file metadata
  const updateInput: IShoppingMallAiBackendProductFile.IUpdate = {
    file_type: "image/png",
    display_order: 2,
    is_primary: true,
  };
  const fileUpdated =
    await api.functional.shoppingMallAiBackend.admin.products.files.update(
      connection,
      {
        productId: productCreate.id,
        fileId: fileCreate.id,
        body: updateInput,
      },
    );
  typia.assert(fileUpdated);

  // 5. Verify updated and unchanged fields
  TestValidator.equals(
    "File id remains unchanged after update",
    fileUpdated.id,
    fileCreate.id,
  );
  TestValidator.equals(
    "Product id remains unchanged after update",
    fileUpdated.shopping_mall_ai_backend_products_id,
    fileCreate.shopping_mall_ai_backend_products_id,
  );
  TestValidator.equals(
    "File URI remains unchanged after update",
    fileUpdated.file_uri,
    fileCreate.file_uri,
  );
  TestValidator.equals(
    "Updated file_type should be 'image/png'",
    fileUpdated.file_type,
    updateInput.file_type,
  );
  TestValidator.equals(
    "Updated display_order should be 2",
    fileUpdated.display_order,
    updateInput.display_order,
  );
  TestValidator.equals(
    "Updated is_primary should be true",
    fileUpdated.is_primary,
    updateInput.is_primary,
  );
}
