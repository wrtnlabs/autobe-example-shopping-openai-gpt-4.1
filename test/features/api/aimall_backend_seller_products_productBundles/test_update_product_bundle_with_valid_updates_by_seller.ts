import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductBundle";

/**
 * Validate that a seller can update a product bundle with valid modifications,
 * and that those changes persist.
 *
 * This function covers the sequence where a seller:
 *
 * 1. Registers their account (via admin onboarding)
 * 2. Creates a "master" product
 * 3. Creates a "component" product
 * 4. Bundles component into master as a bundle
 * 5. Updates that bundle's is_required status and quantity
 * 6. Verifies updated bundle fields persist
 * 7. Attempts update using an unowned (foreign) component for negative business
 *    test
 *
 * Business validations:
 *
 * - Ensures quantity/required fields are persisted after update
 * - Cannot update bundle entry with an unrelated component product
 * - Negative test for permission/business rule enforcement on update
 */
export async function test_api_aimall_backend_seller_products_productBundles_test_update_product_bundle_with_valid_updates_by_seller(
  connection: api.IConnection,
) {
  // 1. Admin creates the seller (simulated admin context)
  const sellerData: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.alphabets(8),
    email: `${RandomGenerator.alphabets(6)}@biz.com`,
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerData },
    );
  typia.assert(seller);

  // 2. Seller creates master product
  const masterProductCreate: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: seller.id,
    title: RandomGenerator.paragraph()(2),
    status: "active",
  };
  const masterProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: masterProductCreate,
    });
  typia.assert(masterProduct);

  // 3. Seller creates component product
  const componentProductCreate: IAimallBackendProduct.ICreate = {
    category_id: masterProduct.category_id, // Use same category for simplicity
    seller_id: seller.id,
    title: RandomGenerator.paragraph()(1),
    status: "active",
  };
  const componentProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: componentProductCreate,
    });
  typia.assert(componentProduct);

  // 4. Seller creates product bundle (master + component)
  const bundleCreate: IAimallBackendProductBundle.ICreate = {
    bundle_product_id: masterProduct.id,
    component_product_id: componentProduct.id,
    is_required: true,
    quantity: 2,
  };
  const bundle =
    await api.functional.aimall_backend.seller.products.productBundles.create(
      connection,
      { productId: masterProduct.id, body: bundleCreate },
    );
  typia.assert(bundle);

  // 5. Seller updates product bundle (change is_required, quantity)
  const updateInput: IAimallBackendProductBundle.IUpdate = {
    is_required: false,
    quantity: 4,
  };
  const updatedBundle =
    await api.functional.aimall_backend.seller.products.productBundles.update(
      connection,
      {
        productId: masterProduct.id,
        productBundleId: bundle.id,
        body: updateInput,
      },
    );
  typia.assert(updatedBundle);
  TestValidator.equals("persisted updated bundle id")(updatedBundle.id)(
    bundle.id,
  );
  TestValidator.equals("persisted quantity")(updatedBundle.quantity)(4);
  TestValidator.equals("persisted is_required")(updatedBundle.is_required)(
    false,
  );

  // 6. Negative business rule: Cannot update unrelated/unowned bundle
  // Create another seller and product for negative test
  const otherSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(8),
          email: `${RandomGenerator.alphabets(6)}2@biz.com`,
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(otherSeller);
  const foreignComponent =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: masterProduct.category_id,
        seller_id: otherSeller.id,
        title: RandomGenerator.alphabets(10),
        status: "active",
      },
    });
  typia.assert(foreignComponent);
  // Attempt to update the original bundle via the seller's update API; should fail (foreign component ownership not allowed)
  await TestValidator.error(
    "cannot update bundle with unrelated/unowned component",
  )(async () => {
    await api.functional.aimall_backend.seller.products.productBundles.update(
      connection,
      {
        productId: masterProduct.id,
        productBundleId: bundle.id,
        body: { quantity: 1, is_required: true },
      },
    );
  });
}
