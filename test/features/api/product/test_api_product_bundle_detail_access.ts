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
 * E2E test to verify that a product bundle detail can be properly retrieved by
 * authorized roles (admin), and correct error is returned for non-existent
 * resources.
 *
 * 1. Register admin (join, store auth token)
 * 2. Create a channel
 * 3. Create section in channel
 * 4. Create root category in channel
 * 5. Register product under admin in created channel/section/category
 * 6. Create bundle under product
 * 7. Retrieve and validate bundle detail matches creation info
 * 8. Assert retrieval with random IDs fails
 */
export async function test_api_product_bundle_detail_access(
  connection: api.IConnection,
) {
  // 1. Register admin and store token
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "pw-" + RandomGenerator.alphaNumeric(8),
      name: adminName,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const adminId = adminJoin.id;

  // 2. Create channel
  const channelBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: channelBody,
    },
  );
  typia.assert(channel);
  const channelId = channel.id;

  // 3. Create section in channel
  const sectionBody = {
    shopping_mall_channel_id: channelId,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(2),
    display_order: typia.random<number & tags.Type<"int32">>(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channelId,
        body: sectionBody,
      },
    );
  typia.assert(section);
  const sectionId = section.id;

  // 4. Create root category
  const categoryBody = {
    shopping_mall_channel_id: channelId,
    parent_id: null,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(1),
    display_order: typia.random<number & tags.Type<"int32">>(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channelId,
        body: categoryBody,
      },
    );
  typia.assert(category);
  const categoryId = category.id;

  // 5. Register product under admin
  const productBody = {
    shopping_mall_seller_id: adminId,
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    shopping_mall_category_id: categoryId,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    status: "Active",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: productBody,
    },
  );
  typia.assert(product);
  const productId = product.id;

  // 6. Create bundle under product
  const bundleBody = {
    shopping_mall_product_id: productId,
    name: RandomGenerator.name(2),
    bundle_type: RandomGenerator.pick(["fixed", "optional"] as const),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    position: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallProductBundle.ICreate;
  const bundle =
    await api.functional.shoppingMall.admin.products.bundles.create(
      connection,
      {
        productId: productId,
        body: bundleBody,
      },
    );
  typia.assert(bundle);

  // 7. Retrieve bundle by productId and bundleId
  const output = await api.functional.shoppingMall.products.bundles.at(
    connection,
    {
      productId: productId,
      bundleId: bundle.id,
    },
  );
  typia.assert(output);

  // 8. Validate all fields in bundle detail
  TestValidator.equals("bundle id matches", output.id, bundle.id);
  TestValidator.equals(
    "product id matches",
    output.shopping_mall_product_id,
    bundle.shopping_mall_product_id,
  );
  TestValidator.equals("bundle name matches", output.name, bundle.name);
  TestValidator.equals(
    "bundle type matches",
    output.bundle_type,
    bundle.bundle_type,
  );
  TestValidator.equals(
    "bundle description matches",
    output.description,
    bundle.description,
  );
  TestValidator.equals(
    "bundle position matches",
    output.position,
    bundle.position,
  );
  // CreatedAt/updatedAt will not be deep-equal as they are timestamps, but should exist
  TestValidator.predicate(
    "created_at exists",
    typeof output.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at exists",
    typeof output.updated_at === "string",
  );

  // 9. Try to get non-existent bundle (random IDs), should fail
  await TestValidator.error(
    "getting non-existent bundle should fail",
    async () => {
      await api.functional.shoppingMall.products.bundles.at(connection, {
        productId: typia.random<string & tags.Format<"uuid">>(),
        bundleId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
