import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";

export async function test_api_product_file_update_success(
  connection: api.IConnection,
) {
  /**
   * E2E test: Seller updates a product file's metadata using the authorized
   * seller context.
   *
   * Business flow:
   *
   * 1. Register a seller and obtain authentication (auto-login).
   * 2. Seller creates a new product.
   * 3. Seller uploads a file attachment for that product.
   * 4. Seller updates the file's metadata (display_order, is_primary, and
   *    file_type) using the correct endpoint.
   * 5. Verify that the updated metadata fields reflect the changes, and that
   *    identifiers and associations remain correct.
   */

  // 1. Seller registration and authentication
  const sellerInput: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const sellerAuthorized = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuthorized);

  // 2. Seller creates a product
  const productInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.content({ paragraphs: 2 }),
    product_type: RandomGenerator.pick([
      "physical",
      "digital",
      "service",
    ] as const),
    business_status: RandomGenerator.pick(["active", "draft"] as const),
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: RandomGenerator.alphaNumeric(6),
    sort_priority: 1,
  };
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 3. Seller uploads a file for the product
  const fileInput: IShoppingMallAiBackendProductFile.ICreate = {
    shopping_mall_ai_backend_products_id: product.id,
    file_uri: `https://cdn.example.com/product/${product.id}/file-${RandomGenerator.alphaNumeric(8)}.jpg`,
    file_type: RandomGenerator.pick([
      "image/jpeg",
      "image/png",
      "application/pdf",
    ] as const),
    display_order: 1,
    is_primary: true,
  };
  const file =
    await api.functional.shoppingMallAiBackend.seller.products.files.create(
      connection,
      { productId: product.id, body: fileInput },
    );
  typia.assert(file);

  // 4. Update product file metadata
  const updatedDisplayOrder = file.display_order + 1;
  const updatedIsPrimary = !file.is_primary;
  const updatedFileType =
    file.file_type === "image/jpeg" ? "image/png" : "image/jpeg";
  const updateInput: IShoppingMallAiBackendProductFile.IUpdate = {
    display_order: updatedDisplayOrder,
    is_primary: updatedIsPrimary,
    file_type: updatedFileType,
  };
  const updatedFile =
    await api.functional.shoppingMallAiBackend.seller.products.files.update(
      connection,
      { productId: product.id, fileId: file.id, body: updateInput },
    );
  typia.assert(updatedFile);

  // 5. Validate update success
  TestValidator.equals("file id is unchanged", updatedFile.id, file.id);
  TestValidator.equals(
    "product association retained",
    updatedFile.shopping_mall_ai_backend_products_id,
    product.id,
  );
  TestValidator.equals(
    "display_order updated",
    updatedFile.display_order,
    updatedDisplayOrder,
  );
  TestValidator.equals(
    "is_primary updated",
    updatedFile.is_primary,
    updatedIsPrimary,
  );
  TestValidator.equals(
    "file_type updated",
    updatedFile.file_type,
    updatedFileType,
  );
  TestValidator.equals(
    "file_uri is unchanged",
    updatedFile.file_uri,
    file.file_uri,
  );
}
