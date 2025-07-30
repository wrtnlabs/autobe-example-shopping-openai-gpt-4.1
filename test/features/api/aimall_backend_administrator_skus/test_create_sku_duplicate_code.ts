import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Validates SKU code uniqueness constraint in AIMall backend (SKU creation
 * API).
 *
 * This test ensures that the backend strictly rejects creation of a SKU with a
 * duplicate sku_code under the same product. It is business-critical to
 * guarantee platform-wide SKU uniqueness for catalog integrity and robust
 * downstream logic. The test simulates a real-world administrative workflow:
 *
 * 1. Create a new product (parent of the SKUs).
 * 2. Create a SKU for that product with a unique sku_code (should succeed).
 * 3. Attempt to create a second SKU under the same product using the same sku_code
 *    (should fail with a uniqueness/conflict error).
 * 4. Validate platform-enforced error handling for duplicate codes.
 */
export async function test_api_aimall_backend_administrator_skus_test_create_sku_duplicate_code(
  connection: api.IConnection,
) {
  // 1. Create a new product to serve as SKU parent
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: `Test Product ${RandomGenerator.alphaNumeric(8)}`,
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Register the initial SKU with a generated code (should succeed)
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(10)}`;
  const sku1 = await api.functional.aimall_backend.administrator.skus.create(
    connection,
    {
      body: {
        product_id: product.id,
        sku_code: skuCode,
      } satisfies IAimallBackendSku.ICreate,
    },
  );
  typia.assert(sku1);
  TestValidator.equals("sku_code matches")(sku1.sku_code)(skuCode);
  TestValidator.equals("product_id matches")(sku1.product_id)(product.id);

  // 3. Attempt duplicate SKU creation with same code under same product (should fail)
  TestValidator.error(
    "duplicate SKU code must trigger conflict/uniqueness error",
  )(async () => {
    await api.functional.aimall_backend.administrator.skus.create(connection, {
      body: {
        product_id: product.id,
        sku_code: skuCode,
      } satisfies IAimallBackendSku.ICreate,
    });
  });
}
