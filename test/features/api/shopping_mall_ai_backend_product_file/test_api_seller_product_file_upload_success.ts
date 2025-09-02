import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";

/**
 * E2E test: Seller successfully uploads a file to their product
 *
 * This test ensures that a seller, after registering and authenticating,
 * can create a product and then upload a file to that product. After
 * uploading, it verifies that the response contains the correct metadata
 * such as file_uri, file_type, and display_order, as per product file API
 * contract. Only implement seller-owns-product scenario, as per business
 * constraints.
 *
 * Steps:
 *
 * 1. Register a seller via api.functional.auth.seller.join (provides
 *    authentication context)
 * 2. Create a product via
 *    api.functional.shoppingMallAiBackend.seller.products.create (product
 *    is owned by the authenticated seller, use realistic input)
 * 3. Upload a file to the product via
 *    api.functional.shoppingMallAiBackend.seller.products.files.create
 * 4. Assert file creation result for expected fields (file_uri, file_type,
 *    display_order, and ownership linkage)
 *
 * Preconditions: None. Test is fully self-contained and does not require
 * pre-existing sellers/products.
 */
export async function test_api_seller_product_file_upload_success(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate seller (context is updated with JWT token)
  const sellerInput: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const sellerAuth: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerInput });
  typia.assert<IShoppingMallAiBackendSeller.IAuthorized>(sellerAuth);

  // Step 2: Create a new product as this seller
  const productInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.name(3),
    slug: RandomGenerator.alphaNumeric(12),
    product_type: "physical", // plausible value per doc: required
    business_status: "active", // plausible value per doc: required
    min_order_quantity: 1,
    max_order_quantity: 100,
    tax_code: "NORMAL", // plausible value per doc: required
    sort_priority: 10,
  };
  const product: IShoppingMallAiBackendProduct =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: productInput },
    );
  typia.assert<IShoppingMallAiBackendProduct>(product);

  // Step 3: Upload file to the product as this seller
  const productFileInput: IShoppingMallAiBackendProductFile.ICreate = {
    shopping_mall_ai_backend_products_id: product.id,
    file_uri: `https://cdn.example.com/products/${product.id}/image.jpg`,
    file_type: "image/jpeg",
    display_order: 0,
    is_primary: true,
  };
  const createdFile: IShoppingMallAiBackendProductFile =
    await api.functional.shoppingMallAiBackend.seller.products.files.create(
      connection,
      { productId: product.id, body: productFileInput },
    );
  typia.assert<IShoppingMallAiBackendProductFile>(createdFile);

  // Step 4: Assert expected metadata/ownership
  TestValidator.equals(
    "File is linked to correct product",
    createdFile.shopping_mall_ai_backend_products_id,
    product.id,
  );
  TestValidator.equals(
    "File URI is set",
    createdFile.file_uri,
    productFileInput.file_uri,
  );
  TestValidator.equals(
    "File type is correct",
    createdFile.file_type,
    productFileInput.file_type,
  );
  TestValidator.equals("Display order is 0", createdFile.display_order, 0);
  TestValidator.equals(
    "Primary file flag is set",
    createdFile.is_primary,
    true,
  );
}
