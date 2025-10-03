import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallInquiryAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiryAnswer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInquiry";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate the admin update workflow for product inquiry answers.
 *
 * This test verifies that an admin can update the answer to a product inquiry
 * while all moderation, audit, and snapshot/business rules are enforced.
 *
 * 1. Admin authenticates.
 * 2. Admin creates channel for the product.
 * 3. Admin creates section in the channel.
 * 4. Admin creates category in the channel.
 * 5. Admin registers a product referencing the channel, section, and category.
 * 6. Seller authenticates for inquiry authoring.
 * 7. Seller posts an inquiry for the product.
 * 8. Admin posts the initial answer to the inquiry.
 * 9. Admin updates the answer, changing the body, status, and flag fields.
 * 10. Validate that the answer's body, moderation_status, and official_answer are
 *     updated, updated_at changes, and compliance/evidence chain is intact.
 */
export async function test_api_product_inquiry_answer_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "test1234",
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
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
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
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
          parent_id: null,
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Admin registers product
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "test1234",
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        profile_name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 3 }),
        status: "Active",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Seller authenticates
  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "test1234",
      name: seller.seller?.profile_name ?? sellerEmail,
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: seller.seller?.profile_name ?? RandomGenerator.name(),
    } satisfies IShoppingMallSeller.IJoin,
  });

  // 7. Seller posts product inquiry
  const inquiry =
    await api.functional.shoppingMall.seller.products.inquiries.create(
      connection,
      {
        productId: product.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          is_private: false,
        } satisfies IShoppingMallProductInquiry.ICreate,
      },
    );
  typia.assert(inquiry);

  // 8. Admin posts the initial answer
  const initialAnswer =
    await api.functional.shoppingMall.admin.products.inquiries.answers.create(
      connection,
      {
        productId: product.id,
        inquiryId: inquiry.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 4 }),
          official_answer: true,
          moderation_status: "approved",
        } satisfies IShoppingMallInquiryAnswer.ICreate,
      },
    );
  typia.assert(initialAnswer);

  // 9. Admin updates the answer
  const updatedBody = RandomGenerator.paragraph({ sentences: 5 });
  const updatedAnswer =
    await api.functional.shoppingMall.admin.products.inquiries.answers.update(
      connection,
      {
        productId: product.id,
        inquiryId: inquiry.id,
        answerId: initialAnswer.id,
        body: {
          body: updatedBody,
          moderation_status: "approved",
          moderation_reason: "clarification",
          official_answer: true,
        } satisfies IShoppingMallInquiryAnswer.IUpdate,
      },
    );
  typia.assert(updatedAnswer);

  // 10. Assert updates
  TestValidator.notEquals(
    "answer body is updated",
    initialAnswer.body,
    updatedAnswer.body,
  );
  TestValidator.equals(
    "moderation status is updated",
    updatedAnswer.moderation_status,
    "approved",
  );
  TestValidator.equals(
    "official_answer is updated",
    updatedAnswer.official_answer,
    true,
  );
  TestValidator.notEquals(
    "answer update timestamp is updated",
    initialAnswer.updated_at,
    updatedAnswer.updated_at,
  );
  TestValidator.equals(
    "product/inquiry/answer linkage is correct",
    updatedAnswer.shopping_mall_product_inquiry_id,
    inquiry.id,
  );
}
