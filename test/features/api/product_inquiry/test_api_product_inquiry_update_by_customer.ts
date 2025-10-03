import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInquiry";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Verify product inquiry update by customer (ownership, audit, privacy,
 * moderation, compliance).
 *
 * 1. Register a customer user
 * 2. Create a channel (admin)
 * 3. Create a section in channel (admin)
 * 4. Create a category in channel (admin)
 * 5. Create product as admin with channel, section, category
 * 6. As customer, create an inquiry for the product
 * 7. As customer, update inquiry (change body, toggle privacy, update title)
 *
 *    - Verify response reflects updated fields (especially body, privacy)
 *    - Confirm audit fields (updated_at changes, created_at remains)
 * 8. Attempt to update with another customer (should error: ownership enforcement)
 */
export async function test_api_product_inquiry_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Create channel as admin
  const channelCode = RandomGenerator.alphaNumeric(12);
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: channelCode,
        name: RandomGenerator.paragraph(),
        description: RandomGenerator.content(),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // 2. Register customer (after channel is created)
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: channel.id,
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 3. Create section
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph(),
          description: RandomGenerator.content(),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Create category
  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph(),
          description: RandomGenerator.content(),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Register product as admin
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph(),
        status: "Active",
        business_status: "Approved",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 6. Customer creates an inquiry on product
  const inquiryCreate = {
    body: RandomGenerator.content(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    is_private: false,
  } satisfies IShoppingMallProductInquiry.ICreate;
  const inquiry: IShoppingMallProductInquiry =
    await api.functional.shoppingMall.customer.products.inquiries.create(
      connection,
      {
        productId: product.id,
        body: inquiryCreate,
      },
    );
  typia.assert(inquiry);

  // 7. Customer updates their own inquiry
  const inquiryUpdate = {
    body: RandomGenerator.content({ paragraphs: 2 }),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    is_private: true,
  } satisfies IShoppingMallProductInquiry.IUpdate;
  const updatedInquiry: IShoppingMallProductInquiry =
    await api.functional.shoppingMall.customer.products.inquiries.update(
      connection,
      {
        productId: product.id,
        inquiryId: inquiry.id,
        body: inquiryUpdate,
      },
    );
  typia.assert(updatedInquiry);
  TestValidator.equals(
    "Updated inquiry body should match input",
    updatedInquiry.body,
    inquiryUpdate.body,
  );
  TestValidator.equals(
    "Updated inquiry is now private",
    updatedInquiry.is_private,
    true,
  );
  TestValidator.equals(
    "Updated inquiry title should match",
    updatedInquiry.title,
    inquiryUpdate.title,
  );
  TestValidator.equals(
    "inquiry id unchanged after update",
    updatedInquiry.id,
    inquiry.id,
  );
  TestValidator.notEquals(
    "updated_at is changed after update",
    updatedInquiry.updated_at,
    inquiry.updated_at,
  );
  TestValidator.equals(
    "created_at does not change on update",
    updatedInquiry.created_at,
    inquiry.created_at,
  );

  // 8. Other customer cannot update inquiry
  const otherCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: channel.id,
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(otherCustomer);
  await TestValidator.error(
    "Other customer cannot update another user's inquiry",
    async () =>
      await api.functional.shoppingMall.customer.products.inquiries.update(
        connection,
        {
          productId: product.id,
          inquiryId: inquiry.id,
          body: {
            ...inquiryUpdate,
            body: RandomGenerator.content({ paragraphs: 1 }),
          } satisfies IShoppingMallProductInquiry.IUpdate,
        },
      ),
  );
}
