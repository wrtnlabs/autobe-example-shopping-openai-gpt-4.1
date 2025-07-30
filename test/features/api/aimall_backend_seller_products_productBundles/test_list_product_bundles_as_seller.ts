import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IPageIAimallBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendProductBundle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductBundle";

/**
 * Validate that a seller can list all product bundles for a product they own.
 *
 * This test simulates the workflow of bundle management for a seller:
 *
 * 1. Create a seller account via admin.
 * 2. Create several products owned by this seller.
 * 3. Assign product bundle relationships: designate one product as the bundle
 *    (master), and others as components, with is_required/quantity attributes.
 * 4. Retrieve the product bundle list for the master (bundle) product.
 * 5. Validate that the response lists all assigned components with correct
 *    bundle/component IDs, is_required, and quantity values.
 *
 * Key requirements:
 *
 * - Bundle relationships must be visible after creation.
 * - All components must be listed under the master product bundle.
 * - Attributes (is_required, quantity) must match input values.
 */
export async function test_api_aimall_backend_seller_products_productBundles_list_product_bundles_as_seller(
  connection: api.IConnection,
) {
  // 1. Create seller (admin operation)
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

  // 2. Create 3 products for seller
  const category_id = typia.random<string & tags.Format<"uuid">>();
  const productInputs: IAimallBackendProduct.ICreate[] = [0, 1, 2].map((i) => ({
    category_id,
    seller_id: seller.id,
    title: RandomGenerator.paragraph()(),
    description: RandomGenerator.content()()(),
    status: "active",
  }));
  const products: IAimallBackendProduct[] = [];
  for (const pi of productInputs) {
    const p = await api.functional.aimall_backend.seller.products.create(
      connection,
      { body: pi },
    );
    typia.assert(p);
    products.push(p);
  }

  // 3. Assign product bundles (make products[0] the master, the other two as components)
  const bundleSpecs = [
    { componentIdx: 1, is_required: true, quantity: 2 },
    { componentIdx: 2, is_required: false, quantity: 1 },
  ];
  const bundles: IAimallBackendProductBundle[] = [];
  for (const spec of bundleSpecs) {
    const createInput: IAimallBackendProductBundle.ICreate = {
      bundle_product_id: products[0].id,
      component_product_id: products[spec.componentIdx].id,
      is_required: spec.is_required,
      quantity: spec.quantity,
    };
    const result =
      await api.functional.aimall_backend.seller.products.productBundles.create(
        connection,
        { productId: products[0].id, body: createInput },
      );
    typia.assert(result);
    bundles.push(result);
  }

  // 4. Retrieve product bundles by master product id
  const bundleList =
    await api.functional.aimall_backend.seller.products.productBundles.index(
      connection,
      { productId: products[0].id },
    );
  typia.assert(bundleList);

  // 5. Validate all components are listed with correct data
  TestValidator.equals("All assigned components present")(
    bundleList.data.length,
  )(bundles.length);
  for (const bundle of bundles) {
    const found = bundleList.data.find(
      (b) => b.component_product_id === bundle.component_product_id,
    );
    TestValidator.predicate(
      `Component product ${bundle.component_product_id} present`,
    )(!!found);
    TestValidator.equals("is_required matches")(found!.is_required)(
      bundle.is_required,
    );
    TestValidator.equals("quantity matches")(found!.quantity)(bundle.quantity);
  }
}
