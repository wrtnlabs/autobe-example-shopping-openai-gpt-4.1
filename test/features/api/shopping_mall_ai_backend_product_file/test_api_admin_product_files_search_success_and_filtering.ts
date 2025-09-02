import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";
import type { IPageIShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductFile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_product_files_search_success_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register a new admin account and authenticate
  const adminUsername = RandomGenerator.alphabets(10);
  const admin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: RandomGenerator.alphaNumeric(20),
        name: RandomGenerator.name(2),
        email: `${adminUsername}@testcompany.com`,
        phone_number: RandomGenerator.mobile(),
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new product as admin
  const product: IShoppingMallAiBackendProduct =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphaNumeric(15),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 12,
            wordMin: 4,
            wordMax: 12,
          }),
          product_type: "physical",
          business_status: "active",
          min_order_quantity: 1,
          max_order_quantity: 100,
          tax_code: "standard",
          sort_priority: 1,
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Attach multiple files to product (at least 3 with different types/orders/primary)
  const fileTypes = ["image/jpeg", "image/png", "application/pdf"] as const;
  const createdFiles: IShoppingMallAiBackendProductFile[] = [];
  for (let i = 0; i < 3; ++i) {
    const file: IShoppingMallAiBackendProductFile =
      await api.functional.shoppingMallAiBackend.admin.products.files.create(
        connection,
        {
          productId: product.id,
          body: {
            shopping_mall_ai_backend_products_id: product.id,
            file_uri: `https://cdn.example.com/prodfile/${RandomGenerator.alphaNumeric(16)}.${fileTypes[i].split("/")[1]}`,
            file_type: fileTypes[i],
            display_order: i + 1,
            is_primary: i === 1, // Only the second file is primary
          } satisfies IShoppingMallAiBackendProductFile.ICreate,
        },
      );
    typia.assert(file);
    createdFiles.push(file);
  }

  // 4. Search for all files (no filters)
  const searchAll =
    await api.functional.shoppingMallAiBackend.admin.products.files.index(
      connection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAiBackendProductFile.IRequest,
      },
    );
  typia.assert(searchAll);
  TestValidator.equals(
    "should return all uploaded files",
    searchAll.data.length,
    createdFiles.length,
  );

  // 5. Filter by file_type=image/png
  const pngSearch =
    await api.functional.shoppingMallAiBackend.admin.products.files.index(
      connection,
      {
        productId: product.id,
        body: {
          file_type: "image/png",
        } satisfies IShoppingMallAiBackendProductFile.IRequest,
      },
    );
  typia.assert(pngSearch);
  TestValidator.equals(
    "should return only the image/png file",
    pngSearch.data.length,
    1,
  );
  TestValidator.equals(
    "file_type in filtered result is png",
    pngSearch.data[0].file_type,
    "image/png",
  );

  // 6. Filter by display_order of second file
  const displayOrderSearch =
    await api.functional.shoppingMallAiBackend.admin.products.files.index(
      connection,
      {
        productId: product.id,
        body: {
          display_order: 2,
        } satisfies IShoppingMallAiBackendProductFile.IRequest,
      },
    );
  typia.assert(displayOrderSearch);
  TestValidator.equals(
    "should return file with matching display_order",
    displayOrderSearch.data.length,
    1,
  );
  TestValidator.equals(
    "display_order matches",
    displayOrderSearch.data[0].display_order,
    2,
  );

  // 7. Filter by is_primary
  const primarySearch =
    await api.functional.shoppingMallAiBackend.admin.products.files.index(
      connection,
      {
        productId: product.id,
        body: {
          is_primary: true,
        } satisfies IShoppingMallAiBackendProductFile.IRequest,
      },
    );
  typia.assert(primarySearch);
  TestValidator.equals(
    "should return only the primary file",
    primarySearch.data.length,
    1,
  );
  TestValidator.equals(
    "is_primary is true in result",
    primarySearch.data[0].is_primary,
    true,
  );

  // 8. Filter with no matching results (is_primary: false and display_order: 9)
  const missingResult =
    await api.functional.shoppingMallAiBackend.admin.products.files.index(
      connection,
      {
        productId: product.id,
        body: {
          is_primary: false,
          display_order: 9,
        } satisfies IShoppingMallAiBackendProductFile.IRequest,
      },
    );
  typia.assert(missingResult);
  TestValidator.equals(
    "should return no results for non-matching filters",
    missingResult.data.length,
    0,
  );

  // 9. Pagination: limit=2 page=1 (should return 2 results), then limit=2 page=2 (should return remaining 1)
  const page1 =
    await api.functional.shoppingMallAiBackend.admin.products.files.index(
      connection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallAiBackendProductFile.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 returns 2 files", page1.data.length, 2);
  const page2 =
    await api.functional.shoppingMallAiBackend.admin.products.files.index(
      connection,
      {
        productId: product.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies IShoppingMallAiBackendProductFile.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 returns 1 file", page2.data.length, 1);

  // 10. Edge case: for a new product with no files, should return empty result
  const product2: IShoppingMallAiBackendProduct =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphaNumeric(15),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 12,
            wordMin: 4,
            wordMax: 12,
          }),
          product_type: "physical",
          business_status: "active",
          min_order_quantity: 1,
          max_order_quantity: 100,
          tax_code: "standard",
          sort_priority: 2,
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(product2);
  const emptyResult =
    await api.functional.shoppingMallAiBackend.admin.products.files.index(
      connection,
      {
        productId: product2.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallAiBackendProductFile.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "should return no files for new product",
    emptyResult.data.length,
    0,
  );

  // 11. Negative test: search by impossible file_type for product2
  const impossibleTypeResult =
    await api.functional.shoppingMallAiBackend.admin.products.files.index(
      connection,
      {
        productId: product2.id,
        body: {
          file_type: "application/zip",
        } satisfies IShoppingMallAiBackendProductFile.IRequest,
      },
    );
  typia.assert(impossibleTypeResult);
  TestValidator.equals(
    "should return no files for impossible type",
    impossibleTypeResult.data.length,
    0,
  );
}
