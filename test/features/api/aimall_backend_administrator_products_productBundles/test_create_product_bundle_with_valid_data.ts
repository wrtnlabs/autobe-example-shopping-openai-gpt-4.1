import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductBundle";

/**
 * Test successful creation of a new product bundle by an administrator.
 *
 * Business context: Product bundles allow grouping multiple products into
 * composite offers. Bundles must be created only among valid, existing products
 * by an admin. This test validates the happy path for bundle creation and
 * verifies all business rules about component association.
 *
 * Step-by-step process:
 *
 * 1. Create "master" product via administrator (used as bundle parent)
 * 2. Create "component" product via administrator (used as included product)
 * 3. Call bundle creation endpoint for the master product, associating it with the
 *    component
 *
 *    - Supply requiredness (is_required: true) and quantity (minimum: 1) fields
 * 4. Validate response:
 *
 *    - Bundle contains correct persisted fields (bundle_product_id,
 *         component_product_id, is_required, quantity, id)
 *    - Bundle references both correct products
 *    - Quantity constraints are respected (quantity at least 1)
 *    - Business logic (products must exist; no duplication) is met
 */
export async function test_api_aimall_backend_administrator_products_productBundles_test_create_product_bundle_with_valid_data(
  connection: api.IConnection,
) {
  // Step 1: Create master product
  const masterProduct =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: "Master Product " + RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(masterProduct);

  // Step 2: Create component product
  const componentProduct =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: "Component Product " + RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(componentProduct);

  // Step 3: Create product bundle
  const bundle =
    await api.functional.aimall_backend.administrator.products.productBundles.create(
      connection,
      {
        productId: masterProduct.id,
        body: {
          bundle_product_id: masterProduct.id,
          component_product_id: componentProduct.id,
          is_required: true,
          quantity: 1,
        } satisfies IAimallBackendProductBundle.ICreate,
      },
    );
  typia.assert(bundle);

  // Step 4: Validate response fields and references
  TestValidator.equals("bundle master product id")(bundle.bundle_product_id)(
    masterProduct.id,
  );
  TestValidator.equals("bundle component product id")(
    bundle.component_product_id,
  )(componentProduct.id);
  TestValidator.equals("is_required flag")(bundle.is_required)(true);
  TestValidator.predicate("quantity should be >= 1")(bundle.quantity >= 1);
  TestValidator.equals("quantity")(bundle.quantity)(1);
  TestValidator.predicate("bundle id is uuid")(
    typeof bundle.id === "string" && /[0-9a-fA-F-]{36}/.test(bundle.id),
  );
}
