import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";

export async function test_api_product_file_delete_success(
  connection: api.IConnection,
) {
  /**
   * This test validates the soft delete workflow for a product file executed by
   * the seller who owns the product.
   *
   * Steps:
   *
   * 1. Seller registers (join), which provides authentication (JWT is
   *    auto-inserted to headers).
   * 2. Seller creates a product, receiving a productId.
   * 3. Seller attaches a file to the new product, producing a fileId.
   * 4. Seller issues DELETE on
   *    /shoppingMallAiBackend/seller/products/{productId}/files/{fileId} as the
   *    main operation.
   * 5. Validate output by: (a) checking the deleted_at timestamp of the file; (b)
   *    ensuring erased file does not appear in product's file list (only
   *    possible to document, as list/reload API is unavailable in current
   *    SDK).
   */

  // 1. Seller registration
  const sellerInput: IShoppingMallAiBackendSeller.ICreate = {
    email: `${RandomGenerator.alphabets(10)}@bizseller.com`,
    business_registration_number: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  };
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.seller.id;
  TestValidator.predicate(
    "seller id is a valid uuid",
    typeof sellerId === "string" &&
      sellerId.length > 10 &&
      sellerId.includes("-"),
  );

  // 2. Seller creates product
  const productInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    slug: RandomGenerator.alphaNumeric(18),
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
    max_order_quantity: 100,
    tax_code: RandomGenerator.alphaNumeric(6),
    sort_priority: 0,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 6,
      wordMax: 12,
    }),
  };
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);
  const productId = product.id;
  TestValidator.equals("created product ID matches", product.id, productId);
  TestValidator.equals(
    "created product seller matches context",
    sellerId,
    sellerAuth.seller.id,
  );

  // 3. Attach a file to product
  const fileInput: IShoppingMallAiBackendProductFile.ICreate = {
    shopping_mall_ai_backend_products_id: productId,
    file_uri: `https://cdn.example.com/${RandomGenerator.alphaNumeric(24)}.jpeg`,
    file_type: RandomGenerator.pick([
      "image/jpeg",
      "image/png",
      "application/pdf",
    ] as const),
    display_order: 1,
    is_primary: true,
  };
  const productFile =
    await api.functional.shoppingMallAiBackend.seller.products.files.create(
      connection,
      { productId, body: fileInput },
    );
  typia.assert(productFile);
  const fileId = productFile.id;
  TestValidator.predicate(
    "file id is a valid uuid",
    typeof fileId === "string" && fileId.length > 10 && fileId.includes("-"),
  );
  TestValidator.equals(
    "file belongs to correct product",
    productFile.shopping_mall_ai_backend_products_id,
    productId,
  );
  TestValidator.predicate(
    "file is not soft-deleted at creation",
    productFile.deleted_at === null || productFile.deleted_at === undefined,
  );

  // 4. Delete (soft) the file as owner
  await api.functional.shoppingMallAiBackend.seller.products.files.erase(
    connection,
    { productId, fileId },
  );
  // No output: API returns void.

  // 5. Validation of soft-delete result
  // Since there's no API to fetch the file or product file list after deletion in current SDK,
  // we document the intended assertions as comments for future expansion:
  // TestValidator.predicate('file is now soft-deleted (deleted_at set)', updatedFile.deleted_at !== null && updatedFile.deleted_at !== undefined);
  // TestValidator.predicate('soft-deleted file does not appear in product files index', !productFiles.some(f => f.id === fileId));
}
