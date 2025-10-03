import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSeoMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSeoMetadata";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Admin SEO metadata creation and update for any product (cross-ownership).
 *
 * 1. Join as first admin (register account, retrieve token)
 * 2. Create a unique channel (code, name, description)
 * 3. Create a section under that channel (code, name, display_order)
 * 4. Create a category under that channel (code, name, display_order)
 * 5. Register a product as admin (product is not owned by specific seller)
 * 6. Create initial SEO metadata for product (PUT call)
 * 7. Update SEO metadata with new values (PUT call)
 * 8. Validate that the returned SEO object reflects updated values
 * 9. Optionally, repeat steps 2-5 with separate admin to simulate cross-ownership,
 *    and update SEO from first admin
 */
export async function test_api_product_seo_metadata_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "password123!",
        name: adminName,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create channel
  const channelBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelBody,
    });
  typia.assert(channel);
  TestValidator.equals("channel code matches", channel.code, channelBody.code);

  // 3. Create section under channel
  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallSection.ICreate;
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionBody,
      },
    );
  typia.assert(section);
  TestValidator.equals("section code matches", section.code, sectionBody.code);

  // 4. Create category under channel
  const categoryBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(7),
    name: RandomGenerator.name(2),
    display_order: typia.random<number & tags.Type<"int32">>(),
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: categoryBody,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "category code matches",
    category.code,
    categoryBody.code,
  );

  // 5. Register product as admin
  const productCode = RandomGenerator.alphaNumeric(16);
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(), // simulate admin control - value is dummy
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: productCode,
    name: RandomGenerator.name(3),
    status: "Active",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);
  TestValidator.equals("product code matches", product.code, productBody.code);

  // 6. Create initial SEO metadata for product
  const seoBody1 = {
    meta_title: RandomGenerator.paragraph({ sentences: 2 }),
    meta_description: RandomGenerator.content({ paragraphs: 1 }),
    meta_keywords: RandomGenerator.name(4),
  } satisfies IShoppingMallProductSeoMetadata.IUpdate;
  const seo1: IShoppingMallProductSeoMetadata =
    await api.functional.shoppingMall.admin.products.seo.update(connection, {
      productId: product.id,
      body: seoBody1,
    });
  typia.assert(seo1);
  TestValidator.equals(
    "SEO meta_title matches",
    seo1.meta_title,
    seoBody1.meta_title,
  );
  TestValidator.equals(
    "SEO meta_description matches",
    seo1.meta_description,
    seoBody1.meta_description,
  );
  TestValidator.equals(
    "SEO meta_keywords matches",
    seo1.meta_keywords,
    seoBody1.meta_keywords,
  );
  TestValidator.equals(
    "SEO belongs to product",
    seo1.shopping_mall_product_id,
    product.id,
  );

  // 7. Update SEO metadata to new values
  const seoBody2 = {
    meta_title: RandomGenerator.paragraph({ sentences: 3 }),
    meta_description: RandomGenerator.content({ paragraphs: 2 }),
    meta_keywords: RandomGenerator.name(6),
  } satisfies IShoppingMallProductSeoMetadata.IUpdate;
  const seo2: IShoppingMallProductSeoMetadata =
    await api.functional.shoppingMall.admin.products.seo.update(connection, {
      productId: product.id,
      body: seoBody2,
    });
  typia.assert(seo2);
  TestValidator.equals(
    "SEO updated meta_title",
    seo2.meta_title,
    seoBody2.meta_title,
  );
  TestValidator.equals(
    "SEO updated meta_description",
    seo2.meta_description,
    seoBody2.meta_description,
  );
  TestValidator.equals(
    "SEO updated meta_keywords",
    seo2.meta_keywords,
    seoBody2.meta_keywords,
  );
  TestValidator.equals(
    "SEO belongs to product after update",
    seo2.shopping_mall_product_id,
    product.id,
  );
  TestValidator.notEquals(
    "SEO meta_title changed after update",
    seo2.meta_title,
    seo1.meta_title,
  );
  TestValidator.notEquals(
    "SEO meta_description changed after update",
    seo2.meta_description,
    seo1.meta_description,
  );
  TestValidator.notEquals(
    "SEO meta_keywords changed after update",
    seo2.meta_keywords,
    seo1.meta_keywords,
  );
}
