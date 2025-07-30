import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Validate that an administrator cannot create a new SKU for a product using a
 * duplicate "sku_code".
 *
 * Business context: SKU codes must be unique per product. Creating a SKU with a
 * code that already exists for the same product must result in a
 * conflict/validation error (typically 409 or equivalent).
 *
 * Workflow:
 *
 * 1. Admin creates a seller (required for product ownership).
 * 2. Seller creates a product under their account.
 * 3. Seller creates an initial SKU for the product with a specific sku_code.
 * 4. Admin attempts to create another SKU for the same product using the exact
 *    same sku_code.
 * 5. Test expects error/validation failure due to duplicate sku_code for the same
 *    product.
 */
export async function test_api_aimall_backend_administrator_products_skus_test_admin_attempts_to_create_sku_with_duplicate_code_fails(
  connection: api.IConnection,
) {
  // 1. Admin creates a seller for test product ownership
  const sellerInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerInput },
    );
  typia.assert(seller);

  // 2. Seller creates a product
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: seller.id,
    title: RandomGenerator.paragraph()(),
    description: RandomGenerator.content()()(),
    main_thumbnail_uri: undefined,
    status: "active",
  };
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 3. Seller creates an initial SKU
  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuInput: IAimallBackendSku.ICreate = {
    product_id: product.id,
    sku_code: skuCode,
  };
  const sku = await api.functional.aimall_backend.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuInput,
    },
  );
  typia.assert(sku);

  // 4. Admin attempts to create another SKU with the same sku_code
  const duplicateSkuInput: IAimallBackendSku.ICreate = {
    product_id: product.id,
    sku_code: skuCode, // duplicate
  };

  await TestValidator.error(
    "duplicate sku_code should result in conflict/validation failure",
  )(async () => {
    await api.functional.aimall_backend.administrator.products.skus.create(
      connection,
      {
        productId: product.id,
        body: duplicateSkuInput,
      },
    );
  });
}
