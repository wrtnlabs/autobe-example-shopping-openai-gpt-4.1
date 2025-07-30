import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Validate that attempts to update SKU fields with invalid data types, formats,
 * or forbidden field values are correctly rejected.
 *
 * This E2E test confirms that the SKU update endpoint
 * `/aimall-backend/seller/products/{productId}/skus/{skuId}` enforces strict
 * data validation rules:
 *
 * - Rejects non-string (e.g., number, object, array, null) values for `sku_code`.
 * - Rejects excessively long SKU codes (e.g., thousands of characters).
 * - Rejects SKU codes with obviously wrong format if one is enforced (e.g.,
 *   whitespace-only, empty string, or with invalid symbols if such constraints
 *   exist).
 *
 * Business context:
 *
 * - A valid product and SKU are created first (using POST
 *   `/aimall-backend/seller/products` and POST
 *   `/aimall-backend/seller/products/{productId}/skus`).
 * - Update attempts are made with various invalid `sku_code` payloads.
 * - Each attempt must yield a validation error (request is rejected; no update
 *   occurs).
 *
 * Steps:
 *
 * 1. Create a valid product as a seller (POST `/aimall-backend/seller/products`).
 * 2. Create a valid SKU for the product (POST
 *    `/aimall-backend/seller/products/{productId}/skus`).
 * 3. Attempt to update the SKU with non-string sku_code (number, object, array,
 *    null), expect validation error for each case.
 * 4. Attempt to update the SKU with an excessively long string (e.g., >1024
 *    characters), expect validation error.
 * 5. Attempt to update the SKU with empty string or whitespace string, expect
 *    validation error if empty not allowed.
 * 6. For each case, assert that the API throws an error using TestValidator.error.
 */
export async function test_api_aimall_backend_seller_products_skus_test_update_sku_with_invalid_data_fields(
  connection: api.IConnection,
) {
  // 1. Create a valid product
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.paragraph()(),
        main_thumbnail_uri: "https://cdn.example.com/prod.jpg",
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 2. Create a valid SKU for the product
  const sku = await api.functional.aimall_backend.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        product_id: product.id,
        sku_code: RandomGenerator.alphaNumeric(10),
      } satisfies IAimallBackendSku.ICreate,
    },
  );
  typia.assert(sku);

  // 3. Try to update SKU with non-string sku_code (number)
  TestValidator.error("sku_code as number should fail")(async () => {
    await api.functional.aimall_backend.seller.products.skus.update(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: {
          sku_code: 123456 as unknown as string, // purposely invalid
        } as IAimallBackendSku.IUpdate,
      },
    );
  });

  // 4. Try to update SKU with non-string sku_code (object)
  TestValidator.error("sku_code as object should fail")(async () => {
    await api.functional.aimall_backend.seller.products.skus.update(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: {
          sku_code: { code: "BAD_TYPE" } as unknown as string,
        } as IAimallBackendSku.IUpdate,
      },
    );
  });

  // 5. Try to update SKU with non-string sku_code (array)
  TestValidator.error("sku_code as array should fail")(async () => {
    await api.functional.aimall_backend.seller.products.skus.update(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: {
          sku_code: ["BAD_ARRAY"] as unknown as string,
        } as IAimallBackendSku.IUpdate,
      },
    );
  });

  // 6. Try to update SKU with non-string sku_code (null)
  TestValidator.error("sku_code as null should fail")(async () => {
    await api.functional.aimall_backend.seller.products.skus.update(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: {
          sku_code: null as unknown as string,
        } as IAimallBackendSku.IUpdate,
      },
    );
  });

  // 7. Try to update SKU with excessively long string for sku_code
  TestValidator.error("sku_code too long should fail")(async () => {
    await api.functional.aimall_backend.seller.products.skus.update(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: {
          sku_code: "X".repeat(5000),
        } satisfies IAimallBackendSku.IUpdate,
      },
    );
  });

  // 8. Try to update SKU with empty string for sku_code
  TestValidator.error("sku_code empty string should fail")(async () => {
    await api.functional.aimall_backend.seller.products.skus.update(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: {
          sku_code: "",
        } satisfies IAimallBackendSku.IUpdate,
      },
    );
  });

  // 9. Try to update SKU with whitespace-only string for sku_code
  TestValidator.error("sku_code whitespace string should fail")(async () => {
    await api.functional.aimall_backend.seller.products.skus.update(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: {
          sku_code: "   ",
        } satisfies IAimallBackendSku.IUpdate,
      },
    );
  });
}
