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
 * Validates that an admin can retrieve the SEO metadata for any product in the
 * system.
 *
 * Workflow:
 *
 * 1. Admin registration (receives authorization and session)
 * 2. Admin creates channel
 * 3. Admin creates section within channel
 * 4. Admin creates category within channel
 * 5. Admin registers a new product with references to all above entities
 * 6. Admin sets SEO metadata for the product
 * 7. Admin retrieves the SEO metadata via GET endpoint
 * 8. Validate all fields: meta_title, meta_description, meta_keywords,
 *    shopping_mall_product_id
 * 9. Confirm that SEO metadata retrieval by admin is not restricted by product
 *    ownership
 */
export async function test_api_product_seo_metadata_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Create a channel
  const channelBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelBody,
    });
  typia.assert(channel);

  // 3. Create a section within the channel
  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
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

  // 4. Create a category within the channel
  const categoryBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
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

  // 5. Register a product
  const productBody = {
    shopping_mall_seller_id: admin.id satisfies string as string,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "Active",
    business_status: "Pending Activation",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. Set SEO metadata
  const seoUpdateBody = {
    meta_title: RandomGenerator.paragraph({ sentences: 2 }),
    meta_description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 7,
    }),
    meta_keywords: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallProductSeoMetadata.IUpdate;
  const updatedSeo: IShoppingMallProductSeoMetadata =
    await api.functional.shoppingMall.admin.products.seo.update(connection, {
      productId: product.id,
      body: seoUpdateBody,
    });
  typia.assert(updatedSeo);

  // 7. Retrieve SEO metadata
  const fetchedSeo: IShoppingMallProductSeoMetadata =
    await api.functional.shoppingMall.admin.products.seo.at(connection, {
      productId: product.id,
    });
  typia.assert(fetchedSeo);

  // 8. Validate fields
  TestValidator.equals(
    "meta_title matches",
    fetchedSeo.meta_title,
    seoUpdateBody.meta_title,
  );
  TestValidator.equals(
    "meta_description matches",
    fetchedSeo.meta_description,
    seoUpdateBody.meta_description,
  );
  TestValidator.equals(
    "meta_keywords matches",
    fetchedSeo.meta_keywords,
    seoUpdateBody.meta_keywords,
  );
  TestValidator.equals(
    "product id matches",
    fetchedSeo.shopping_mall_product_id,
    product.id,
  );
}
