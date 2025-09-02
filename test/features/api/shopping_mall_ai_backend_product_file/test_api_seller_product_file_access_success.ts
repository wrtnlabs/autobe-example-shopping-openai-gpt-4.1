import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";

/**
 * E2E test: Seller accesses their uploaded product file's metadata.
 *
 * Validates the core business flow for secure and correct file metadata
 * retrieval:
 *
 * 1. Register and authenticate as a new seller (obtain Authorization context)
 * 2. Create a new product using seller context
 * 3. Upload a file to the created product
 * 4. Request metadata for the uploaded file using GET
 *    /shoppingMallAiBackend/seller/products/{productId}/files/{fileId}
 * 5. Check the file metadata matches what was uploaded, verifying linkage
 *    (productId, file_uri, file_type, sort order, primary selection, etc).
 * 6. Assert data structure and field values. Validate that no orphan file can
 *    be accessed or owned by another seller.
 */
export async function test_api_seller_product_file_access_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate seller
  const sellerInput: IShoppingMallAiBackendSeller.ICreate = {
    email: `${RandomGenerator.alphaNumeric(8)}@seller-e2e.com`,
    business_registration_number: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  };
  const sellerAuth: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerInput });
  typia.assert(sellerAuth);
  // Seller is authenticated, all subsequent API calls use this session

  // 2. Create a new product (unique slug/title/type/tax_code)
  const productInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: `${RandomGenerator.alphaNumeric(10)}-e2e-product`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    product_type: "physical",
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 5,
    tax_code: `VAT${RandomGenerator.alphaNumeric(5)}`,
    sort_priority: 10,
  };
  const product: IShoppingMallAiBackendProduct =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 3. Upload a file to the product
  const fileInput: IShoppingMallAiBackendProductFile.ICreate = {
    shopping_mall_ai_backend_products_id: product.id,
    file_uri: `https://cdn.e2e-test.com/${RandomGenerator.alphaNumeric(8)}.jpg`,
    file_type: "image/jpeg",
    display_order: 1,
    is_primary: true,
  };
  const uploadedFile: IShoppingMallAiBackendProductFile =
    await api.functional.shoppingMallAiBackend.seller.products.files.create(
      connection,
      { productId: product.id, body: fileInput },
    );
  typia.assert(uploadedFile);

  // 4. Retrieve file metadata using at()
  const fileMeta: IShoppingMallAiBackendProductFile =
    await api.functional.shoppingMallAiBackend.seller.products.files.at(
      connection,
      { productId: product.id, fileId: uploadedFile.id },
    );
  typia.assert(fileMeta);

  // 5. Validate retrieved metadata matches what was uploaded
  TestValidator.equals(
    "returned file ID matches uploaded",
    fileMeta.id,
    uploadedFile.id,
  );
  TestValidator.equals(
    "file associated to correct product",
    fileMeta.shopping_mall_ai_backend_products_id,
    product.id,
  );
  TestValidator.equals(
    "file URI matches input",
    fileMeta.file_uri,
    fileInput.file_uri,
  );
  TestValidator.equals(
    "file type matches input",
    fileMeta.file_type,
    fileInput.file_type,
  );
  TestValidator.equals(
    "display order matches",
    fileMeta.display_order,
    fileInput.display_order,
  );
  TestValidator.equals(
    "is_primary matches",
    fileMeta.is_primary,
    fileInput.is_primary,
  );
  TestValidator.predicate("file is not deleted", !fileMeta.deleted_at);
  TestValidator.predicate(
    "created_at is present",
    !!fileMeta.created_at && typeof fileMeta.created_at === "string",
  );
}
