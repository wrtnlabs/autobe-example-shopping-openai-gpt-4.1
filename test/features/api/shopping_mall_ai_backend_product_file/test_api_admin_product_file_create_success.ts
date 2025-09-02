import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";

export async function test_api_admin_product_file_create_success(
  connection: api.IConnection,
) {
  /**
   * E2E test for successful upload/registration of a new admin product file.
   *
   * This test validates that:
   *
   * 1. An admin can register (authenticate),
   * 2. Can create a new product,
   * 3. Can attach (upload/register) a file to that product
   * 4. The returned file object is correctly linked to the product with all
   *    expected metadata.
   *
   * Business rules are enforced, such as is_primary (should be allowed for
   * first file), and all DTO constraints are observed.
   */

  // 1. Register a new admin account
  const adminUsername: string = RandomGenerator.alphaNumeric(12);
  const adminEmail: string = `${RandomGenerator.alphaNumeric(8)}@company.com`;
  const adminPasswordHash: string = RandomGenerator.alphaNumeric(32);
  const admin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: adminPasswordHash,
        name: RandomGenerator.name(),
        email: adminEmail,
        phone_number: RandomGenerator.mobile(),
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate("admin account is active", admin.admin.is_active);

  // 2. Create a new product as admin (to get productId)
  const product: IShoppingMallAiBackendProduct =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          slug: RandomGenerator.alphaNumeric(16),
          description: RandomGenerator.content({ paragraphs: 2 }),
          product_type: RandomGenerator.pick([
            "physical",
            "digital",
            "service",
          ] as const),
          business_status: RandomGenerator.pick([
            "active",
            "draft",
            "paused",
          ] as const),
          min_order_quantity: 1,
          max_order_quantity: 10,
          tax_code: RandomGenerator.alphaNumeric(6),
          sort_priority: 0,
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Upload/create a product file for this product
  const fileUri = `https://cdn.example.com/files/${RandomGenerator.alphaNumeric(24)}`;
  const fileType = RandomGenerator.pick([
    "image/jpeg",
    "image/png",
    "application/pdf",
  ] as const);
  const fileOrder = 0;
  const isPrimary = true;
  const productFile: IShoppingMallAiBackendProductFile =
    await api.functional.shoppingMallAiBackend.admin.products.files.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_ai_backend_products_id: product.id,
          file_uri: fileUri,
          file_type: fileType,
          display_order: fileOrder,
          is_primary: isPrimary,
        } satisfies IShoppingMallAiBackendProductFile.ICreate,
      },
    );
  typia.assert(productFile);

  // 4. Validate association/fields
  TestValidator.equals(
    "file is linked to correct product",
    productFile.shopping_mall_ai_backend_products_id,
    product.id,
  );
  TestValidator.equals("file URI matches input", productFile.file_uri, fileUri);
  TestValidator.equals(
    "file type matches input",
    productFile.file_type,
    fileType,
  );
  TestValidator.equals(
    "display order is correct",
    productFile.display_order,
    fileOrder,
  );
  TestValidator.equals(
    "file is set as primary",
    productFile.is_primary,
    isPrimary,
  );
  TestValidator.predicate(
    "product file has string creation timestamp",
    typeof productFile.created_at === "string" && !!productFile.created_at,
  );
}
