import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFavoriteInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteInquiry";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInquiry";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validate customer creation of favorite inquiry entries (bookmarking Q&A).
 *
 * Ensures a customer can mark an existing inquiry as favorite (Q&A bookmark).
 * Includes:
 *
 * 1. Prerequisite setup—Channel, Section, Category, Product are created as admin.
 * 2. Registered customer creation & authentication.
 * 3. Creation of an inquiry for a product as the same customer.
 * 4. Favorite creation for that inquiry by the same customer. Check fields:
 *
 *    - Should set 'shopping_mall_product_inquiry_id' correctly
 *    - 'shopping_mall_favorite_snapshot_id' must be a valid UUID
 *    - 'notification_enabled' should match request (true by default)
 *    - Audit: created_at/updated_at must exist and be date-times
 * 5. Duplicate prevention: same customer/inquiry must fail with error.
 * 6. Access error: favoriting inquiry not accessible or non-existent is denied.
 * 7. All linkages: check favorite->inquiry->product->channel consistency.
 *
 * This functional E2E covers normal flows and core error handling for favorite
 * inquiry features in the customer scope.
 */
export async function test_api_favorite_inquiry_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Admin: create channel, section, category, product
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphabets(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph(),
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
          code: RandomGenerator.alphabets(5),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
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
          code: RandomGenerator.alphabets(5),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2. Register and login as customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 3. Admin: create product (simulate as admin, use customer channel)
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        status: "Active",
        business_status: "Approved",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Customer: create product inquiry
  const inquiry =
    await api.functional.shoppingMall.customer.products.inquiries.create(
      connection,
      {
        productId: product.id,
        body: {
          body: RandomGenerator.paragraph(),
          title: RandomGenerator.paragraph({ sentences: 1 }),
          is_private: false,
        } satisfies IShoppingMallProductInquiry.ICreate,
      },
    );
  typia.assert(inquiry);

  // 5. Customer: create favorite for inquiry
  const favorite =
    await api.functional.shoppingMall.customer.favoriteInquiries.create(
      connection,
      {
        body: {
          shopping_mall_product_inquiry_id: inquiry.id,
          notification_enabled: true,
          batch_label: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IShoppingMallFavoriteInquiry.ICreate,
      },
    );
  typia.assert(favorite);
  TestValidator.equals(
    "favorite inquiry link",
    favorite.shopping_mall_product_inquiry_id,
    inquiry.id,
  );
  TestValidator.predicate(
    "favorite snapshot id is UUID",
    typeof favorite.shopping_mall_favorite_snapshot_id === "string" &&
      /^[0-9a-f-]{36}$/i.test(favorite.shopping_mall_favorite_snapshot_id),
  );
  TestValidator.equals(
    "favorite notification enabled",
    favorite.notification_enabled,
    true,
  );
  TestValidator.predicate(
    "favorite created_at is ISO datetime",
    typeof favorite.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
        favorite.created_at,
      ),
  );
  TestValidator.predicate(
    "favorite updated_at is ISO datetime",
    typeof favorite.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
        favorite.updated_at,
      ),
  );

  // 6. Customer: duplicate favorite fails
  await TestValidator.error("duplicate favorite is prevented", async () => {
    await api.functional.shoppingMall.customer.favoriteInquiries.create(
      connection,
      {
        body: {
          shopping_mall_product_inquiry_id: inquiry.id,
        } satisfies IShoppingMallFavoriteInquiry.ICreate,
      },
    );
  });

  // 7. Customer: favoriting non-existent inquiry fails
  await TestValidator.error(
    "favoriting non-existent inquiry fails",
    async () => {
      await api.functional.shoppingMall.customer.favoriteInquiries.create(
        connection,
        {
          body: {
            shopping_mall_product_inquiry_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies IShoppingMallFavoriteInquiry.ICreate,
        },
      );
    },
  );

  // 8. Linkage audit: favorite inquiry and product channel id match
  TestValidator.equals(
    "favorite inquiry-product linkage ok",
    inquiry.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "favorite -> customer matches",
    favorite.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "product channel linkage ok",
    product.shopping_mall_channel_id,
    channel.id,
  );
}
