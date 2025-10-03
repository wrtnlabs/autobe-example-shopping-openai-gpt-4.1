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
 * Validate that a customer can update the metadata of their favorite inquiry,
 * enforcing ownership, correct field updates, audit traceability, and error
 * handling for invalid/unauthorized operations.
 *
 * Steps:
 *
 * 1. Admin: Create channel, section, category, product.
 * 2. Customer: Join/register with channel.
 * 3. Customer: Create an inquiry for the product.
 * 4. Customer: Favorite the created inquiry, get favoriteInquiryId.
 * 5. Customer: Update favorite inquiry's notification/label, check updated_at
 *    advances, check values change properly.
 * 6. Try (a) updating non-existent favorite; (b) update after deletion (if
 *    possible); (c) update as another customer -- all must error.
 */
export async function test_api_favorite_inquiry_metadata_update_by_customer(
  connection: api.IConnection,
) {
  // Create channel
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

  // Create section
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // Create category
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // Create product (admin powers, e.g. set seller+status arbitrarily)
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerId,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        status: "active",
        business_status: "approved",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Register customer (join) for the channel
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // Customer creates inquiry for the product
  const inquiry =
    await api.functional.shoppingMall.customer.products.inquiries.create(
      connection,
      {
        productId: product.id,
        body: {
          body: RandomGenerator.paragraph(),
          is_private: false,
          title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallProductInquiry.ICreate,
      },
    );
  typia.assert(inquiry);

  // Customer favorites the inquiry
  const favorite =
    await api.functional.shoppingMall.customer.favoriteInquiries.create(
      connection,
      {
        body: {
          shopping_mall_product_inquiry_id: inquiry.id,
          notification_enabled: true,
          batch_label: "InitialLabel",
        } satisfies IShoppingMallFavoriteInquiry.ICreate,
      },
    );
  typia.assert(favorite);

  // Update favorite application's notification_enabled and batch_label fields
  const updated =
    await api.functional.shoppingMall.customer.favoriteInquiries.update(
      connection,
      {
        favoriteInquiryId: favorite.id,
        body: {
          notification_enabled: false,
          batch_label: "UpdatedLabel",
        } satisfies IShoppingMallFavoriteInquiry.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.notEquals(
    "updated_at must advance after update",
    updated.updated_at,
    favorite.updated_at,
  );
  TestValidator.equals(
    "notification_enabled updated",
    updated.notification_enabled,
    false,
  );
  TestValidator.equals(
    "batch_label updated",
    updated.batch_label,
    "UpdatedLabel",
  );

  // Attempt: update non-existent favorite (UUID likely not registered, always error)
  await TestValidator.error(
    "update non-existent favorite inquiry should error",
    async () => {
      await api.functional.shoppingMall.customer.favoriteInquiries.update(
        connection,
        {
          favoriteInquiryId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            notification_enabled: true,
          } satisfies IShoppingMallFavoriteInquiry.IUpdate,
        },
      );
    },
  );

  // (Optionally) Attempt: update after deletion -- assumption: logical delete is possible
  // (We cannot delete via available API, so this error path may be skipped.)

  // Register a second customer
  const otherCustomerEmail = typia.random<string & tags.Format<"email">>();
  const otherCustomer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: otherCustomerEmail,
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(otherCustomer);

  // Switch to second customer (JWT in connection automatically updated after join)
  // Try: update the first customer's favorite inquiry (should fail with 403 error)
  await TestValidator.error(
    "second customer is forbidden to update other's favorite inquiry",
    async () => {
      await api.functional.shoppingMall.customer.favoriteInquiries.update(
        connection,
        {
          favoriteInquiryId: favorite.id,
          body: {
            notification_enabled: true,
          } satisfies IShoppingMallFavoriteInquiry.IUpdate,
        },
      );
    },
  );
}
