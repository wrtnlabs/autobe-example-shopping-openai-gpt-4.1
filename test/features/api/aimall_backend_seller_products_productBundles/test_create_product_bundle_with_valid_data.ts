import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductBundle";

/**
 * Test creation of a product bundle as a seller, enforcing assignment and
 * uniqueness constraints.
 *
 * Business context: This test simulates a seller creating a new main product
 * and a component product, then assigning that component as a bundle item to
 * the main product. It verifies that the product bundle is created with all
 * expected references and properties, and that the API prevents duplicate
 * component assignments to the same bundle group (enforces uniqueness
 * constraint per product).
 *
 * Workflow steps:
 *
 * 1. Create a main (bundle/master) product as a seller.
 * 2. Create a component product under the same seller.
 * 3. Call the product bundle API to assign component to main product, passing
 *    valid bundle_product_id, component_product_id, is_required, and quantity
 *    fields.
 * 4. Verify the response includes correct linking (IDs) and field values.
 * 5. Attempt to assign the same component to the same main product again, expect
 *    an API error for uniqueness violation.
 */
export async function test_api_aimall_backend_seller_products_productBundles_test_create_product_bundle_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a main product (the bundle group/master)
  const mainProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Bundle Master " + RandomGenerator.alphaNumeric(8),
        description: RandomGenerator.paragraph()(2),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(mainProduct);

  // 2. Create a component product for the bundle - must be different ID but same seller
  const componentProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: mainProduct.seller_id,
        title: "Component Product " + RandomGenerator.alphaNumeric(8),
        description: RandomGenerator.paragraph()(2),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(componentProduct);

  // 3. Assign component product as a bundle item to the main product
  const bundleInput = {
    bundle_product_id: mainProduct.id,
    component_product_id: componentProduct.id,
    is_required: true,
    quantity: 2,
  } satisfies IAimallBackendProductBundle.ICreate;
  const bundle =
    await api.functional.aimall_backend.seller.products.productBundles.create(
      connection,
      {
        productId: mainProduct.id,
        body: bundleInput,
      },
    );
  typia.assert(bundle);

  // 4. Validate return fields and linkage
  TestValidator.equals("bundle main product ref")(bundle.bundle_product_id)(
    mainProduct.id,
  );
  TestValidator.equals("bundle component product ref")(
    bundle.component_product_id,
  )(componentProduct.id);
  TestValidator.equals("is_required flag")(bundle.is_required)(true);
  TestValidator.equals("bundle quantity")(bundle.quantity)(2);

  // 5. Try assigning the same component to the main product again: uniqueness check
  await TestValidator.error("duplicate component in bundle should fail")(
    async () => {
      await api.functional.aimall_backend.seller.products.productBundles.create(
        connection,
        {
          productId: mainProduct.id,
          body: bundleInput,
        },
      );
    },
  );
}
