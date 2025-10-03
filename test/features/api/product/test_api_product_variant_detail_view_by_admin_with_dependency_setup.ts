import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Test retrieving business detail of a specific product variant as an admin.
 * Validates prerequisite setup of channel, section, category, product, and
 * variant. Verifies variant is correctly linked to the product, proper admin
 * context, and positive and negative permission handling.
 */
export async function test_api_product_variant_detail_view_by_admin_with_dependency_setup(
  connection: api.IConnection,
) {
  // 1. Admin registration & authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminName: string = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securePass123",
        name: adminName,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Create section
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          display_order: typia.random<number & tags.Type<"int32">>(),
          description: RandomGenerator.paragraph(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Create category
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          display_order: typia.random<number & tags.Type<"int32">>(),
          description: RandomGenerator.paragraph(),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Register product as admin (simulate as admin is the seller & all fk linkage)
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: admin.id satisfies string as string, // Use admin.id as test seller for admin
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        status: "Active",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Register product variant
  const variantSku = RandomGenerator.alphaNumeric(12);
  const variantOptHash = RandomGenerator.alphaNumeric(16);
  const variant =
    await api.functional.shoppingMall.admin.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          sku_code: variantSku,
          bar_code: null,
          option_values_hash: variantOptHash,
          price: 19900,
          stock_quantity: 10,
          weight: 0.3,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);

  // 7. Positive detail GET as admin
  const read = await api.functional.shoppingMall.admin.products.variants.at(
    connection,
    {
      productId: product.id,
      variantId: variant.id,
    },
  );
  typia.assert(read);
  TestValidator.equals("variant id matches", read.id, variant.id);
  TestValidator.equals(
    "product relation correct",
    read.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals("sku code correct", read.sku_code, variantSku);
  TestValidator.equals(
    "option values hash matches",
    read.option_values_hash,
    variantOptHash,
  );

  // 8. Negative case: wrong productId
  await TestValidator.error("error for mismatched productId", async () => {
    await api.functional.shoppingMall.admin.products.variants.at(connection, {
      productId: typia.random<string & tags.Format<"uuid">>(),
      variantId: variant.id,
    });
  });

  // 9. Negative case: wrong variantId
  await TestValidator.error("error for mismatched variantId", async () => {
    await api.functional.shoppingMall.admin.products.variants.at(connection, {
      productId: product.id,
      variantId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 10. Negative case: access without admin token (simulate: un-authenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access as missing token",
    async () => {
      await api.functional.shoppingMall.admin.products.variants.at(unauthConn, {
        productId: product.id,
        variantId: variant.id,
      });
    },
  );
}
