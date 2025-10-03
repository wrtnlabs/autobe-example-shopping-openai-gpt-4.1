import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInquiry";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate seller's access to both private and public product inquiries for
 * their own product.
 *
 * Scenario:
 *
 * 1. Admin creates channel, section, category, and product.
 * 2. Seller registers for the respective section/channel.
 * 3. Customer joins and creates both a private and public inquiry for the product.
 * 4. As the product's seller, API call is made to retrieve each inquiry detail.
 *    Both should be accessible to the seller.
 * 5. As a non-author, non-seller (e.g., a different customer), attempt to access
 *    private inquiry and validate permission denial.
 * 6. Validate returned fields: author references/roles, is_private, audit
 *    timestamps, soft-delete, etc.
 */
export async function test_api_seller_product_inquiry_detail_access(
  connection: api.IConnection,
) {
  // 1. Register an admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminPW1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Create section in channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Create category in channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Register Seller (assign to section)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "sellerPW1234",
      name: RandomGenerator.name(),
      phone: null,
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(1),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 6. Register the product (owned by seller)
  const productCode = RandomGenerator.alphaNumeric(12);
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: productCode,
        name: RandomGenerator.name(),
        status: "Active",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 7. Register a customer (for creating inquiries)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      password: "custPW1234",
      name: RandomGenerator.name(),
      phone: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 8. Customer creates product inquiries (one private, one public)
  // - Private Inquiry
  const privateInquiry =
    await api.functional.shoppingMall.customer.products.inquiries.create(
      connection,
      {
        productId: product.id,
        body: {
          title: "Secret Question",
          body: RandomGenerator.paragraph({ sentences: 4 }),
          is_private: true,
        } satisfies IShoppingMallProductInquiry.ICreate,
      },
    );
  typia.assert(privateInquiry);

  // - Public Inquiry
  const publicInquiry =
    await api.functional.shoppingMall.customer.products.inquiries.create(
      connection,
      {
        productId: product.id,
        body: {
          title: "Public Question",
          body: RandomGenerator.paragraph({ sentences: 2 }),
          is_private: false,
        } satisfies IShoppingMallProductInquiry.ICreate,
      },
    );
  typia.assert(publicInquiry);

  // 9. As seller, access both inquiries (should both succeed)
  // Note: Seller is already authenticated due to join.
  const sellerPrivateAccess =
    await api.functional.shoppingMall.seller.products.inquiries.at(connection, {
      productId: product.id,
      inquiryId: privateInquiry.id,
    });
  typia.assert(sellerPrivateAccess);
  TestValidator.equals(
    "private inquiry id matches",
    sellerPrivateAccess.id,
    privateInquiry.id,
  );
  TestValidator.predicate(
    "private inquiry is_private field true",
    sellerPrivateAccess.is_private === true,
  );
  TestValidator.equals(
    "private inquiry product id",
    sellerPrivateAccess.shopping_mall_product_id,
    product.id,
  );
  // Author/role fields (should have shopping_mall_customer_id)
  TestValidator.equals(
    "private inquiry customer authored",
    sellerPrivateAccess.shopping_mall_customer_id,
    customer.id,
  );

  const sellerPublicAccess =
    await api.functional.shoppingMall.seller.products.inquiries.at(connection, {
      productId: product.id,
      inquiryId: publicInquiry.id,
    });
  typia.assert(sellerPublicAccess);
  TestValidator.equals(
    "public inquiry id matches",
    sellerPublicAccess.id,
    publicInquiry.id,
  );
  TestValidator.predicate(
    "public inquiry is_private field false",
    sellerPublicAccess.is_private === false,
  );

  // 10. Register extra customer and try to access private inquiry (should fail)
  const strangerEmail = typia.random<string & tags.Format<"email">>();
  const stranger = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: strangerEmail,
      password: "strangerPW4321",
      name: RandomGenerator.name(),
      phone: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(stranger);
  await TestValidator.error(
    "non-author/non-seller access to private inquiry fails",
    async () => {
      await api.functional.shoppingMall.seller.products.inquiries.at(
        connection,
        {
          productId: product.id,
          inquiryId: privateInquiry.id,
        },
      );
    },
  );

  // 11. Validate audit fields (timestamps, moderation status, soft-delete)
  TestValidator.predicate(
    "inquiry created_at present",
    typeof privateInquiry.created_at === "string",
  );
  TestValidator.predicate(
    "inquiry updated_at present",
    typeof privateInquiry.updated_at === "string",
  );
  TestValidator.equals(
    "private inquiry not deleted",
    privateInquiry.deleted_at,
    null,
  );
  TestValidator.equals(
    "public inquiry not deleted",
    publicInquiry.deleted_at,
    null,
  );
  TestValidator.equals(
    "moderation_status not empty",
    typeof privateInquiry.moderation_status,
    "string",
  );
  TestValidator.equals(
    "moderation_status not empty",
    typeof publicInquiry.moderation_status,
    "string",
  );
}
