import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBundle";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Admin product bundle update scenario test.
 *
 * This test covers the admin's end-to-end workflow for updating product
 * bundles, ensuring business rules, uniqueness, metadata updates, and error
 * handling are enforced.
 *
 * 1. Admin registration and authentication
 * 2. Create channel (for registering product)
 * 3. Create section in the channel
 * 4. Create category in the channel
 * 5. Register a new product assigning channel/section/category
 * 6. Create a product bundle attached to the product
 * 7. Update bundle: a. Successfully update name, description, bundle_type, and
 *    position; verify persistence b. Update with a duplicate name (should fail)
 *    c. Update with invalid data (e.g., empty name) and expect error
 * 8. Confirm only updated fields change, others remain the same
 * 9. Verify updated_at is changed after update
 */
export async function test_api_product_bundle_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "S3cureP@ssw0rd!",
      name: adminName,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create channel
  const channelCreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelCreate },
  );
  typia.assert(channel);

  // 3. Create section
  const sectionCreate = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionCreate,
      },
    );
  typia.assert(section);

  // 4. Create category
  const categoryCreate = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: categoryCreate,
      },
    );
  typia.assert(category);

  // 5. Register product
  const productCreate = {
    shopping_mall_seller_id: admin.id, // Use admin as seller for this test
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "Active", // Use a plausible status value
    business_status: "Approval", // Use a plausible workflow state
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    { body: productCreate },
  );
  typia.assert(product);

  // 6. Create bundle
  const bundleCreate = {
    shopping_mall_product_id: product.id,
    name: "BundleA",
    bundle_type: "fixed",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    position: 1,
  } satisfies IShoppingMallProductBundle.ICreate;
  const bundle =
    await api.functional.shoppingMall.admin.products.bundles.create(
      connection,
      {
        productId: product.id,
        body: bundleCreate,
      },
    );
  typia.assert(bundle);

  // Store old updated_at for audit check
  const previousUpdatedAt = bundle.updated_at;

  // 7a. Update all fields successfully
  const updateInput = {
    name: "BundleA_Premium",
    bundle_type: "optional",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    position: 2,
  } satisfies IShoppingMallProductBundle.IUpdate;
  const updatedBundle =
    await api.functional.shoppingMall.admin.products.bundles.update(
      connection,
      {
        productId: product.id,
        bundleId: bundle.id,
        body: updateInput,
      },
    );
  typia.assert(updatedBundle);
  TestValidator.equals(
    "bundle id should not change",
    updatedBundle.id,
    bundle.id,
  );
  TestValidator.notEquals(
    "updated_at should change after update",
    updatedBundle.updated_at,
    previousUpdatedAt,
  );
  TestValidator.equals("name updated", updatedBundle.name, updateInput.name);
  TestValidator.equals(
    "bundle_type updated",
    updatedBundle.bundle_type,
    updateInput.bundle_type,
  );
  TestValidator.equals(
    "description updated",
    updatedBundle.description,
    updateInput.description,
  );
  TestValidator.equals(
    "position updated",
    updatedBundle.position,
    updateInput.position,
  );
  // Confirm shopping_mall_product_id did not change
  TestValidator.equals(
    "product id in bundle remains the same",
    updatedBundle.shopping_mall_product_id,
    bundle.shopping_mall_product_id,
  );

  // 7b. Try to update to duplicate name (should fail)
  // Create another bundle to try duplication
  const secondBundleCreate = {
    shopping_mall_product_id: product.id,
    name: "UniqueBundleName2",
    bundle_type: "fixed",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    position: 3,
  } satisfies IShoppingMallProductBundle.ICreate;
  const bundle2 =
    await api.functional.shoppingMall.admin.products.bundles.create(
      connection,
      {
        productId: product.id,
        body: secondBundleCreate,
      },
    );
  typia.assert(bundle2);

  // Attempt to update bundle2 with duplicate name from previously updated bundle
  await TestValidator.error(
    "should fail to update to a duplicate bundle name",
    async () => {
      await api.functional.shoppingMall.admin.products.bundles.update(
        connection,
        {
          productId: product.id,
          bundleId: bundle2.id,
          body: {
            name: updateInput.name,
          } satisfies IShoppingMallProductBundle.IUpdate,
        },
      );
    },
  );

  // 7c. Try to update with invalid data (empty name)
  await TestValidator.error(
    "should fail to update bundle to empty name",
    async () => {
      await api.functional.shoppingMall.admin.products.bundles.update(
        connection,
        {
          productId: product.id,
          bundleId: bundle.id,
          body: {
            name: "",
          } satisfies IShoppingMallProductBundle.IUpdate,
        },
      );
    },
  );

  // 8. Confirm only specific fields changed, others are same
  TestValidator.equals(
    "id unchanged after update",
    updatedBundle.id,
    bundle.id,
  );
  TestValidator.equals(
    "shopping_mall_product_id unchanged after update",
    updatedBundle.shopping_mall_product_id,
    bundle.shopping_mall_product_id,
  );

  // 9. Confirm updated_at is after previous updated_at
  TestValidator.predicate(
    "updated_at is after previous value",
    new Date(updatedBundle.updated_at) > new Date(previousUpdatedAt),
  );
}
