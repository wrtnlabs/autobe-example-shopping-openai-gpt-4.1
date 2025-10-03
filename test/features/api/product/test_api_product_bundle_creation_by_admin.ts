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
 * Verify product bundle creation flow and duplicate protection for admin user.
 *
 * 1. Register a new admin and retrieve credentials
 * 2. Create a channel (code, name, description)
 * 3. Under channel, create a section (code, name, display_order, etc)
 * 4. Under channel, create a category (code, name, display_order, optional
 *    parent_id)
 * 5. Register a product with given seller (synthetic), channel, section, and
 *    category ids; use unique code/name/status
 * 6. Create a bundle associated to that product (name, type, description,
 *    position)
 * 7. Assert attributes of bundle and their relationship (product_id etc)
 * 8. Attempt to create another bundle with the same name for this product and
 *    check error is thrown (business uniqueness constraint).
 */
export async function test_api_product_bundle_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(14);
  const name = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email,
      password,
      name,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create channel
  const channelCreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: channelCreate,
    },
  );
  typia.assert(channel);

  // 3. Create section under channel
  const sectionCreate = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(1),
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

  // 4. Create category under channel
  const categoryCreate = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(1),
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

  // 5. Register product under seller, channel, section, and category
  // Admin is not a seller - for test we synthesize a seller uuid
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const productCreate = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    status: RandomGenerator.pick(["Active", "Draft", "Paused"] as const),
    business_status: RandomGenerator.pick([
      "Approval",
      "Pending Activation",
      "Blocked",
    ] as const),
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: productCreate,
    },
  );
  typia.assert(product);

  // 6. Create product bundle
  const bundleName = RandomGenerator.name(2);
  const bundleCreate = {
    shopping_mall_product_id: product.id,
    name: bundleName,
    bundle_type: RandomGenerator.pick(["fixed", "optional"] as const),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    position: typia.random<number & tags.Type<"int32">>(),
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

  TestValidator.equals(
    "bundle is linked to correct product",
    bundle.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals("bundle name matches", bundle.name, bundleName);
  TestValidator.equals(
    "bundle bundle_type matches",
    bundle.bundle_type,
    bundleCreate.bundle_type,
  );
  TestValidator.equals(
    "bundle position matches",
    bundle.position,
    bundleCreate.position,
  );
  if (
    bundleCreate.description !== undefined &&
    bundleCreate.description !== null
  )
    TestValidator.equals(
      "bundle description matches",
      bundle.description,
      bundleCreate.description,
    );

  // 7. Error: Attempt to create bundle with duplicate name for same product
  await TestValidator.error(
    "duplicate bundle name for product errors",
    async () => {
      await api.functional.shoppingMall.admin.products.bundles.create(
        connection,
        {
          productId: product.id,
          body: {
            ...bundleCreate,
          },
        },
      );
    },
  );
}
