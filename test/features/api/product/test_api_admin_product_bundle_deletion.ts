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
 * Test admin soft-deletion of a product bundle with full setup and negative
 * assertions.
 *
 * 1. Register and authenticate an admin.
 * 2. Admin creates a new channel.
 * 3. Admin creates a section under the channel.
 * 4. Admin creates a category under the channel.
 * 5. Register a product with the above channel/section/category.
 * 6. Create a bundle for this product.
 * 7. Perform soft-delete (logical deletion) of the bundle as admin.
 * 8. Validate that deleted_at is populated (now soft deleted).
 * 9. Try deleting the same bundle again (should error as already deleted).
 *
 * Note: Since no bundle-list or bundle-get endpoint is provided in the API set,
 * we focus on successful deletion and error on second attempt.
 */
export async function test_api_admin_product_bundle_deletion(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "adminPass123",
        name: adminName,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a new channel
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // 3. Create a section under the channel
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Create a category under the channel
  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(7),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Register a product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(), // Admin can use any seller id for test
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        status: "Active",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 6. Create a product bundle for this product
  const bundle: IShoppingMallProductBundle =
    await api.functional.shoppingMall.admin.products.bundles.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          name: RandomGenerator.name(2),
          bundle_type: RandomGenerator.pick(["fixed", "optional"] as const),
          description: RandomGenerator.paragraph(),
          position: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallProductBundle.ICreate,
      },
    );
  typia.assert(bundle);

  // 7. Perform soft-delete (logical deletion) of the bundle as admin
  await api.functional.shoppingMall.admin.products.bundles.erase(connection, {
    productId: product.id,
    bundleId: bundle.id,
  });

  // There is no bundle get or list, so just assert deletion worked by deleting again (should error)
  await TestValidator.error(
    "admin cannot delete already deleted bundle",
    async () => {
      await api.functional.shoppingMall.admin.products.bundles.erase(
        connection,
        {
          productId: product.id,
          bundleId: bundle.id,
        },
      );
    },
  );
}
