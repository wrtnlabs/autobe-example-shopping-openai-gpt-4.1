import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductBundle";

/**
 * Validate administrator's ability to update a product bundle (required-ness
 * and quantity).
 *
 * Business context: Administrators can manage product bundles regardless of
 * seller ownership. Bundles link a master product to a component product, with
 * options for how many units and whether the component is required. Business
 * logic enforces that quantity must be positive (minimum 1), the component
 * product must exist, and relationships remain valid.
 *
 * Step-by-step process:
 *
 * 1. Create a master product (admin action).
 * 2. Create a component product (admin action).
 * 3. Link master and component products by creating a product bundle.
 * 4. Update the bundle to:
 *
 *    - Change 'is_required'
 *    - Change 'quantity' (valid case)
 * 5. Validate changes are applied correctly.
 * 6. Attempt to update with invalid 'quantity' (e.g., 0 or negative; must fail).
 * 7. Attempt to update with non-existent component (skip; API does not support
 *    updating component_product_id).
 */
export async function test_api_aimall_backend_administrator_products_productBundles_test_update_product_bundle_required_fields_as_admin(
  connection: api.IConnection,
) {
  // 1. Create a master product
  const masterProduct: IAimallBackendProduct =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: `Master Product ${RandomGenerator.alphabets(5)}`,
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(masterProduct);

  // 2. Create a component product
  const componentProduct: IAimallBackendProduct =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: `Component Product ${RandomGenerator.alphabets(5)}`,
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(componentProduct);

  // 3. Create the bundle between master and component products
  const bundle: IAimallBackendProductBundle =
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

  // 4. Update the bundle fields (is_required and quantity)
  const updatedBundle: IAimallBackendProductBundle =
    await api.functional.aimall_backend.administrator.products.productBundles.update(
      connection,
      {
        productId: masterProduct.id,
        productBundleId: bundle.id,
        body: {
          is_required: false,
          quantity: 2,
        } satisfies IAimallBackendProductBundle.IUpdate,
      },
    );
  typia.assert(updatedBundle);
  TestValidator.equals("component product unchanged")(
    updatedBundle.component_product_id,
  )(componentProduct.id);
  TestValidator.equals("required-ness updated")(updatedBundle.is_required)(
    false,
  );
  TestValidator.equals("quantity updated")(updatedBundle.quantity)(2);

  // 5. Attempt invalid update: quantity = 0 (should fail business rule: minimum 1)
  await TestValidator.error("quantity must be positive")(async () => {
    await api.functional.aimall_backend.administrator.products.productBundles.update(
      connection,
      {
        productId: masterProduct.id,
        productBundleId: bundle.id,
        body: {
          quantity: 0,
        } satisfies IAimallBackendProductBundle.IUpdate,
      },
    );
  });
}
