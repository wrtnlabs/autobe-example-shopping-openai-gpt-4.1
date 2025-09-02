import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";

export async function test_api_admin_product_file_view_success(
  connection: api.IConnection,
) {
  /**
   * E2E test for verifying file metadata retrieval by admin for product file
   * attachments.
   *
   * Steps:
   *
   * 1. Register as a new admin and auto-login (acquire full admin privileges for
   *    subsequent operations).
   * 2. Create a product as admin with all business-required fields.
   * 3. Upload a file (image/document) to the product, specifying realistic URI,
   *    file type, and metadata.
   * 4. Retrieve the uploaded file's metadata using its fileId and the parent
   *    productId.
   * 5. Assert response validity and that returned metadata matches what was
   *    uploaded.
   * 6. Confirm admin privilege enables full access to product file metadata.
   */

  // 1. Register and login as new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: RandomGenerator.name(),
        password_hash: RandomGenerator.alphaNumeric(32),
        name: RandomGenerator.name(),
        email: adminEmail,
        is_active: true,
        phone_number: RandomGenerator.mobile(),
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new product
  const slug = RandomGenerator.alphaNumeric(10);
  const productCreateInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug,
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 7,
      sentenceMax: 14,
    }),
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
    sort_priority: 1,
  };
  const product: IShoppingMallAiBackendProduct =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: productCreateInput,
      },
    );
  typia.assert(product);

  // 3. Upload a file to the product
  const fileCreateInput: IShoppingMallAiBackendProductFile.ICreate = {
    shopping_mall_ai_backend_products_id: product.id,
    file_uri: `https://cdn.test.com/${RandomGenerator.alphaNumeric(16)}.jpg`,
    file_type: RandomGenerator.pick([
      "image/jpeg",
      "image/png",
      "application/pdf",
      "application/zip",
    ] as const),
    display_order: 0,
    is_primary: true,
  };
  const uploadedFile: IShoppingMallAiBackendProductFile =
    await api.functional.shoppingMallAiBackend.admin.products.files.create(
      connection,
      {
        productId: product.id,
        body: fileCreateInput,
      },
    );
  typia.assert(uploadedFile);

  // 4. Retrieve the uploaded file's metadata by productId and fileId
  const fileMetadata: IShoppingMallAiBackendProductFile =
    await api.functional.shoppingMallAiBackend.admin.products.files.at(
      connection,
      {
        productId: product.id,
        fileId: uploadedFile.id,
      },
    );
  typia.assert(fileMetadata);

  // 5. Assert values: all key fields match what was uploaded/created
  TestValidator.equals("file id matches", fileMetadata.id, uploadedFile.id);
  TestValidator.equals(
    "attached product id matches",
    fileMetadata.shopping_mall_ai_backend_products_id,
    product.id,
  );
  TestValidator.equals(
    "file URI matches",
    fileMetadata.file_uri,
    fileCreateInput.file_uri,
  );
  TestValidator.equals(
    "file type matches",
    fileMetadata.file_type,
    fileCreateInput.file_type,
  );
  TestValidator.equals(
    "display order matches",
    fileMetadata.display_order,
    fileCreateInput.display_order,
  );
  TestValidator.equals(
    "is_primary matches",
    fileMetadata.is_primary,
    fileCreateInput.is_primary,
  );

  // 6. Business logic: created_at should be ISO string
  TestValidator.predicate(
    "created_at is ISO 8601 date",
    !!fileMetadata.created_at && !isNaN(Date.parse(fileMetadata.created_at)),
  );
}
