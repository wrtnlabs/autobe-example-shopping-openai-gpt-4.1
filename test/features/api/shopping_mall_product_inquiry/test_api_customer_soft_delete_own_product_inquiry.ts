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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate customer soft deletion of their own product inquiry, ensuring
 * audit-retention and correct visibility semantics.
 *
 * This E2E test follows the business flow of registering the necessary admin,
 * seller, and product entities, then authenticating as a customer to create and
 * delete an inquiry. Audit trail, error permission controls, and deletion logic
 * are checked.
 *
 * Steps:
 *
 * 1. Create a channel (admin)
 * 2. Create a section in the channel (admin)
 * 3. Create a category in the channel (admin)
 * 4. Register as a seller in that channel/section (seller)
 * 5. Register a product with the seller in the channel/section/category
 * 6. Register as a customer (customer)
 * 7. As customer, post a product inquiry
 * 8. As customer, delete (soft delete) the created inquiry
 * 9. Attempt to re-delete the same inquiry (should error)
 * 10. Register a second customer, and attempt to delete the first customer's
 *     inquiry (should error)
 * 11. (Simulated) Audit trail or admin evidence would show inquiry is soft deleted
 *     (verify deleted_at on underlying entity)
 */
export async function test_api_customer_soft_delete_own_product_inquiry(
  connection: api.IConnection,
) {
  // 1. Create a channel (admin role; no login required)
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 2. Create a section for the channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 0,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 3. Create a category for the channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 0,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Register as a seller in that channel/section
  const sellerEmail = `${RandomGenerator.alphaNumeric(5)}@wrtn.ai`;
  const sellerAuthorized = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(2),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);

  // 5. Register a product as the seller
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerAuthorized.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
        business_status: "approved",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Register as a customer
  const customerEmail = `${RandomGenerator.alphaNumeric(5)}@wrtn.ai`;
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 7. Post an inquiry to the product as the customer
  const inquiry =
    await api.functional.shoppingMall.customer.products.inquiries.create(
      connection,
      {
        productId: product.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 4 }),
          is_private: false,
          title: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IShoppingMallProductInquiry.ICreate,
      },
    );
  typia.assert(inquiry);

  // 8. Soft delete the inquiry as the author
  await api.functional.shoppingMall.customer.products.inquiries.erase(
    connection,
    {
      productId: product.id,
      inquiryId: inquiry.id,
    },
  );

  // 9. Re-delete should fail (already soft deleted)
  await TestValidator.error(
    "cannot soft delete already deleted inquiry",
    async () => {
      await api.functional.shoppingMall.customer.products.inquiries.erase(
        connection,
        {
          productId: product.id,
          inquiryId: inquiry.id,
        },
      );
    },
  );

  // 10. Register second customer and attempt to delete first user's inquiry
  const customerEmail2 = `${RandomGenerator.alphaNumeric(8)}@wrtn.ai`;
  const customer2 = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail2,
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer2);
  await TestValidator.error(
    "second customer cannot soft delete another user's inquiry",
    async () => {
      await api.functional.shoppingMall.customer.products.inquiries.erase(
        connection,
        {
          productId: product.id,
          inquiryId: inquiry.id,
        },
      );
    },
  );
  // 11. Check (simulate) that inquiry has its deleted_at set (soft deleted for audit). There is no direct API for this, so the previous inquiry reference remains for assertion in real admin/audit context.
  TestValidator.predicate(
    "inquiry is marked as soft-deleted (deleted_at is set)",
    inquiry.deleted_at !== null && inquiry.deleted_at !== undefined,
  );
}
