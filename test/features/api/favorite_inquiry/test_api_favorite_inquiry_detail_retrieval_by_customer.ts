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
 * Verify that an authenticated customer can retrieve a detailed favorite
 * inquiry by favoriteInquiryId, and only the owner can access it.
 *
 * Steps:
 *
 * 1. Register a new customer
 * 2. Create a channel as admin
 * 3. Create a section and category in the channel
 * 4. Register a product tied to the channel, section, and category
 * 5. Customer submits a product inquiry to the product
 * 6. Customer favorites that inquiry
 * 7. Retrieve the favorite inquiry by favoriteInquiryId and validate details
 * 8. Attempt to retrieve with non-existent ID (should fail)
 * 9. Attempt to retrieve with another user (should be forbidden)
 */
export async function test_api_favorite_inquiry_detail_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new channel, section, category, and product (as admin context - assumed auto-authenticated for admin endpoints)
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2. Register product (admin context)
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(), // Arbitrary seller for test
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "Active",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 3. Register a shopping mall customer (became the grabbing user for the favorite)
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: channel.id,
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        phone: null,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 4. Create a product inquiry as the customer
  const inquiry: IShoppingMallProductInquiry =
    await api.functional.shoppingMall.customer.products.inquiries.create(
      connection,
      {
        productId: product.id,
        body: {
          body: RandomGenerator.content({ paragraphs: 1 }),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          is_private: false,
        } satisfies IShoppingMallProductInquiry.ICreate,
      },
    );
  typia.assert(inquiry);

  // 5. Customer favorites the inquiry
  const favorite: IShoppingMallFavoriteInquiry =
    await api.functional.shoppingMall.customer.favoriteInquiries.create(
      connection,
      {
        body: {
          shopping_mall_product_inquiry_id: inquiry.id,
          notification_enabled: true,
          batch_label: RandomGenerator.name(2),
        } satisfies IShoppingMallFavoriteInquiry.ICreate,
      },
    );
  typia.assert(favorite);

  // 6. Retrieve the favorite by its ID and validate
  const retrieved: IShoppingMallFavoriteInquiry =
    await api.functional.shoppingMall.customer.favoriteInquiries.at(
      connection,
      {
        favoriteInquiryId: favorite.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "retrieved favoriteInquiryId matches created",
    retrieved.id,
    favorite.id,
  );
  TestValidator.equals(
    "linked customer matches",
    retrieved.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "linked inquiry matches",
    retrieved.shopping_mall_product_inquiry_id,
    inquiry.id,
  );
  TestValidator.predicate(
    "notification enabled flag is correct",
    retrieved.notification_enabled === true,
  );
  TestValidator.equals(
    "batch label matches",
    retrieved.batch_label,
    favorite.batch_label,
  );

  // 7. Not-found case: retrieve with a random (not created) favoriteInquiryId
  await TestValidator.error(
    "retrieving non-existent favoriteInquiryId fails",
    async () => {
      await api.functional.shoppingMall.customer.favoriteInquiries.at(
        connection,
        {
          favoriteInquiryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 8. Forbidden case: another customer attempts to retrieve this favorite inquiry
  // Register a second customer
  const otherCustomerEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const otherCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: channel.id,
        email: otherCustomerEmail,
        password: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        phone: null,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(otherCustomer);
  // By joining, the connection is switched to other customer context automatically
  await TestValidator.error(
    "other customer is forbidden to retrieve favorite inquiry",
    async () => {
      await api.functional.shoppingMall.customer.favoriteInquiries.at(
        connection,
        {
          favoriteInquiryId: favorite.id,
        },
      );
    },
  );
}
