import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductBundle";

/**
 * Validate the system rejects creating a duplicate product bundle component for
 * a product.
 *
 * As a seller, test that the system prevents assigning the same component
 * product more than once in a bundle group.
 *
 * Step-by-step:
 *
 * 1. Create a main (master) product with valid fields.
 * 2. Create a component product (must be separate from master, both valid and
 *    under same seller).
 * 3. Assign the component product to the main product as a bundle (with
 *    is_required = true, quantity = 1).
 * 4. Attempt to assign the same component product a second time to the same bundle
 *    group with same fields.
 * 5. System must reject the duplicate create attempt, returning a validation or
 *    conflict error.
 * 6. Ensure that error is thrown and is not silent, and no additional duplicate
 *    productBundle resource is created.
 */
export async function test_api_aimall_backend_seller_products_productBundles_test_create_product_bundle_with_duplicate_component_should_fail(
  connection: api.IConnection,
) {
  // 1. Create a master product
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const masterProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: categoryId,
        seller_id: sellerId,
        title: "Main Product - Duplicate Test",
        description: "Main product for duplicate bundle scenario.",
        status: "active",
        main_thumbnail_uri: undefined,
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(masterProduct);

  // 2. Create a component product
  const componentProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: categoryId,
        seller_id: sellerId,
        title: "Component Product - Duplicate Test",
        description: "Component product for duplicate assignment test.",
        status: "active",
        main_thumbnail_uri: undefined,
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(componentProduct);

  // 3. Assign the component as a bundle component of the master
  const bundlePayload: IAimallBackendProductBundle.ICreate = {
    bundle_product_id: masterProduct.id,
    component_product_id: componentProduct.id,
    is_required: true,
    quantity: 1,
  };
  const createdBundle =
    await api.functional.aimall_backend.seller.products.productBundles.create(
      connection,
      {
        productId: masterProduct.id,
        body: bundlePayload,
      },
    );
  typia.assert(createdBundle);

  // 4. Attempt to assign same component again to same master
  // 5. Expect error (validation/conflict)
  await TestValidator.error("Duplicate bundle assignment should fail")(
    async () => {
      await api.functional.aimall_backend.seller.products.productBundles.create(
        connection,
        {
          productId: masterProduct.id,
          body: bundlePayload,
        },
      );
    },
  );
}
