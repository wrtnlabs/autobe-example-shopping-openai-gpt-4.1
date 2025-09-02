import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";
import type { IPageIShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductFile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_seller_product_files_list_success(
  connection: api.IConnection,
) {
  /** 1. Register and authenticate as a seller */
  const sellerInput: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);

  /** 2. Create a new product under the seller */
  const productInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    product_type: RandomGenerator.pick(["physical", "digital"] as const),
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
  const productId = product.id;

  /** 3. Attach multiple files (e.g. 4 files with mixed types & statuses) */
  const fileTypes = [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "application/zip",
  ] as const;
  const numFiles = 4;
  const fileInputs: IShoppingMallAiBackendProductFile.ICreate[] =
    ArrayUtil.repeat(numFiles, (i) => ({
      shopping_mall_ai_backend_products_id: productId,
      file_uri: `https://cdn.example.com/file_${RandomGenerator.alphaNumeric(10)}.${fileTypes[i].split("/")[1]}`,
      file_type: fileTypes[i],
      display_order: i + 1,
      is_primary: i === 0, // first file is primary
    }));
  const createdFiles: IShoppingMallAiBackendProductFile[] = [];
  for (const fileInput of fileInputs) {
    const fileObj =
      await api.functional.shoppingMallAiBackend.seller.products.files.create(
        connection,
        { productId, body: fileInput },
      );
    typia.assert(fileObj);
    createdFiles.push(fileObj);
  }

  /** 4. List files with filtering by file_type */
  for (const type of fileTypes) {
    const listByType =
      await api.functional.shoppingMallAiBackend.seller.products.files.index(
        connection,
        {
          productId,
          body: { file_type: type },
        },
      );
    typia.assert(listByType);
    const expected = createdFiles
      .filter((f) => f.file_type === type)
      .map(
        (f): IShoppingMallAiBackendProductFile.ISummary => ({
          id: f.id,
          file_uri: f.file_uri,
          file_type: f.file_type,
          is_primary: f.is_primary,
          display_order: f.display_order,
        }),
      );
    TestValidator.equals(
      `filtering files by file_type=${type}`,
      listByType.data,
      expected,
    );
  }

  /** 5. List files with filtering by is_primary */
  for (const is_primary of [true, false]) {
    const listByPrimary =
      await api.functional.shoppingMallAiBackend.seller.products.files.index(
        connection,
        {
          productId,
          body: { is_primary },
        },
      );
    typia.assert(listByPrimary);
    const expected = createdFiles
      .filter((f) => f.is_primary === is_primary)
      .map(
        (f): IShoppingMallAiBackendProductFile.ISummary => ({
          id: f.id,
          file_uri: f.file_uri,
          file_type: f.file_type,
          is_primary: f.is_primary,
          display_order: f.display_order,
        }),
      );
    TestValidator.equals(
      `filtering files by is_primary=${is_primary}`,
      listByPrimary.data,
      expected,
    );
  }

  /** 6. List files by display_order */
  for (let d = 1; d <= numFiles; ++d) {
    const listByOrder =
      await api.functional.shoppingMallAiBackend.seller.products.files.index(
        connection,
        {
          productId,
          body: { display_order: d },
        },
      );
    typia.assert(listByOrder);
    const expected = createdFiles
      .filter((f) => f.display_order === d)
      .map(
        (f): IShoppingMallAiBackendProductFile.ISummary => ({
          id: f.id,
          file_uri: f.file_uri,
          file_type: f.file_type,
          is_primary: f.is_primary,
          display_order: f.display_order,
        }),
      );
    TestValidator.equals(
      `filtering files by display_order=${d}`,
      listByOrder.data,
      expected,
    );
  }

  /** 7. List files with pagination (limit=2, page=1 & 2, sort by display_order:asc) */
  const limit = 2;
  for (const page of [1, 2]) {
    const listPaged =
      await api.functional.shoppingMallAiBackend.seller.products.files.index(
        connection,
        {
          productId,
          body: { limit, page, sort: "display_order:asc" },
        },
      );
    typia.assert(listPaged);
    // Defensive sorting in case API returns unordered files
    const expected = [...createdFiles]
      .sort((a, b) => a.display_order - b.display_order)
      .slice((page - 1) * limit, page * limit)
      .map(
        (f): IShoppingMallAiBackendProductFile.ISummary => ({
          id: f.id,
          file_uri: f.file_uri,
          file_type: f.file_type,
          is_primary: f.is_primary,
          display_order: f.display_order,
        }),
      );
    TestValidator.equals(
      `pagination page=${page} limit=${limit}`,
      listPaged.data,
      expected,
    );
  }

  /** 8. List files with a non-existent file_type filter */
  const nonExistentType = "audio/mpeg";
  const emptyResult =
    await api.functional.shoppingMallAiBackend.seller.products.files.index(
      connection,
      {
        productId,
        body: { file_type: nonExistentType },
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    `filter by non-existent file_type=${nonExistentType} should return no results`,
    emptyResult.data,
    [],
  );
}
