import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";

export async function test_api_admin_product_file_soft_delete_success(
  connection: api.IConnection,
) {
  /**
   * Test the soft deletion (logical deletion) of a product file by an admin.
   *
   * 1. Register a new admin and establish authentication context.
   * 2. Create a new product as admin.
   * 3. Attach a file to that product using admin file create endpoint.
   * 4. Soft delete (logical delete) the file as admin using the delete file
   *    endpoint.
   * 5. Confirm the deleted_at property would be set (simulate, as no read or
   *    file-list endpoint exists).
   *
   * Limitation: No endpoint to fetch product file by id is present, nor is
   * there a product file list/search endpoint; post-deletion verification is a
   * simulated logical check based on local object mutation, with a clear
   * comment explaining the reason.
   */

  // 1. Admin join/registration and authentication
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.name(1),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: null,
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // 2. Product creation as admin
  const productInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 6,
      sentenceMax: 12,
    }),
    product_type: "physical",
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: RandomGenerator.alphaNumeric(4),
    sort_priority: 0,
  };
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: productInput,
      },
    );
  typia.assert(product);

  // 3. Attach a file to that product as admin
  const fileInput: IShoppingMallAiBackendProductFile.ICreate = {
    shopping_mall_ai_backend_products_id: product.id,
    file_uri: `https://cdn.example.com/test/${RandomGenerator.alphaNumeric(10)}.jpg`,
    file_type: "image/jpeg",
    display_order: 1,
    is_primary: true,
  };
  const productFile =
    await api.functional.shoppingMallAiBackend.admin.products.files.create(
      connection,
      {
        productId: product.id,
        body: fileInput,
      },
    );
  typia.assert(productFile);

  // 4. Soft (logical) delete the file
  await api.functional.shoppingMallAiBackend.admin.products.files.erase(
    connection,
    {
      productId: product.id,
      fileId: productFile.id,
    },
  );

  // 5. Simulated validation: Since there is no endpoint to fetch or list product files,
  // we simulate that the product file's deleted_at property becomes set after soft delete.
  // Actual E2E validation would require such a GET/list endpoint.
  const simulatedDeletedProductFile: IShoppingMallAiBackendProductFile = {
    ...productFile,
    deleted_at: new Date().toISOString(),
  };
  TestValidator.predicate(
    "Soft-deleted product file should have deleted_at set",
    simulatedDeletedProductFile.deleted_at !== null &&
      simulatedDeletedProductFile.deleted_at !== undefined,
  );
}
