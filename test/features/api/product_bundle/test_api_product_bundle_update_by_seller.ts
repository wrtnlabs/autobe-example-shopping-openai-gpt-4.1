import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBundle";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate seller-driven update of product bundle metadata and business logic.
 *
 * The workflow is:
 *
 * 1. Register and authenticate as a new seller.
 * 2. Create a channel (admin) for the product.
 * 3. Create a section (admin) in the channel.
 * 4. Create a primary category (admin) in the channel.
 * 5. Register a new product as the seller, assigned to the prepared channel,
 *    section, and category.
 * 6. Create the first bundle under that product with unique name and initial
 *    metadata.
 * 7. Update the bundle: change the name, bundle_type, description, and position.
 *    Assert all updated fields are correctly reflected; verify audit timestamps
 *    change. Use typia.assert on response type.
 * 8. Update only 1 or 2 fields (partial update) to check minimal payload
 *    semantics: e.g., name only or description null.
 * 9. Create another bundle under the same product, then attempt to update it to a
 *    duplicate name (using the first bundle's name). This should fail by
 *    business rules (expect error, but not a type error, and no as any usage).
 */
export async function test_api_product_bundle_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller Registration & Authentication
  const channelName = RandomGenerator.name();
  const sectionName = RandomGenerator.name();
  const categoryName = RandomGenerator.name();
  const sellerProfileName = RandomGenerator.name();
  // Admin context: assume direct API call (simulate admin permissions)
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: channelName,
        description: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: sectionName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: categoryName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const joinSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "TestP4ssword@!",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: sellerProfileName,
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joinSeller);
  // 2. Product Registration by seller
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: joinSeller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        status: "Active",
        business_status: "Approved",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create Initial Bundle (bundleA)
  const bundleNameA = RandomGenerator.paragraph({ sentences: 3 });
  const bundleA =
    await api.functional.shoppingMall.seller.products.bundles.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          name: bundleNameA,
          bundle_type: "fixed",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          position: 1,
        } satisfies IShoppingMallProductBundle.ICreate,
      },
    );
  typia.assert(bundleA);
  // 4. Update bundleA (all fields)
  const newBundleName = RandomGenerator.paragraph({ sentences: 3 });
  const updateA =
    await api.functional.shoppingMall.seller.products.bundles.update(
      connection,
      {
        productId: product.id,
        bundleId: bundleA.id,
        body: {
          name: newBundleName,
          bundle_type: "optional",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          position: 2,
        } satisfies IShoppingMallProductBundle.IUpdate,
      },
    );
  typia.assert(updateA);
  TestValidator.notEquals(
    "updated name should differ",
    bundleA.name,
    updateA.name,
  );
  TestValidator.equals("updated name is correct", updateA.name, newBundleName);
  TestValidator.equals("updated bundle_type", updateA.bundle_type, "optional");
  TestValidator.notEquals(
    "audit timestamp changes",
    bundleA.updated_at,
    updateA.updated_at,
  );
  // 5. Partial update: only name
  const newName2 = RandomGenerator.name(2);
  const updateA2 =
    await api.functional.shoppingMall.seller.products.bundles.update(
      connection,
      {
        productId: product.id,
        bundleId: bundleA.id,
        body: {
          name: newName2,
        } satisfies IShoppingMallProductBundle.IUpdate,
      },
    );
  typia.assert(updateA2);
  TestValidator.equals(
    "updated name after minimal update",
    updateA2.name,
    newName2,
  );
  TestValidator.equals(
    "other fields unchanged after minimal update",
    updateA2.bundle_type,
    updateA.bundle_type,
  );
  // 6. Partial update: clear description (set to null)
  const updateA3 =
    await api.functional.shoppingMall.seller.products.bundles.update(
      connection,
      {
        productId: product.id,
        bundleId: bundleA.id,
        body: {
          description: null,
        } satisfies IShoppingMallProductBundle.IUpdate,
      },
    );
  typia.assert(updateA3);
  TestValidator.equals(
    "description is null after update",
    updateA3.description,
    null,
  );
  // 7. Bundle name conflict test: create bundleB, attempt to update its name to bundleA's current name
  const bundleB =
    await api.functional.shoppingMall.seller.products.bundles.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          name: RandomGenerator.name(2),
          bundle_type: "fixed",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          position: 3,
        } satisfies IShoppingMallProductBundle.ICreate,
      },
    );
  typia.assert(bundleB);
  await TestValidator.error(
    "should fail to update bundleB to a duplicate name",
    async () => {
      await api.functional.shoppingMall.seller.products.bundles.update(
        connection,
        {
          productId: product.id,
          bundleId: bundleB.id,
          body: {
            name: updateA3.name,
          } satisfies IShoppingMallProductBundle.IUpdate,
        },
      );
    },
  );
}
