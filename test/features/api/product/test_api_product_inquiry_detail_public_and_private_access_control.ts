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

/**
 * Validates detail retrieval and access control of product inquiries for both
 * public and private cases.
 *
 * Scenario:
 *
 * 1. Admin creates channel, section, category, and product using admin APIs
 *    (requires admin authentication).
 * 2. Customer-A joins the channel as a customer and is issued an authentication
 *    token.
 * 3. Customer-B joins the channel as a customer.
 * 4. Customer-A creates two inquiries about the product: one public, one private
 *    (is_private: true).
 * 5. Customer-A can retrieve both their own inquiries (public and private). Assert
 *    all DTO fields, privacy flags, author assignment, etc.
 * 6. Customer-B can retrieve Customer-A's public inquiry (should succeed) but gets
 *    access denied or forbidden for the private inquiry.
 * 7. Assert field-level visibility regarding author, privacy attributes, and
 *    moderation, especially for privacy scope.
 * 8. Attempt to retrieve a non-existent inquiry by a random UUID; expect 404 or
 *    relevant not-found behavior.
 */
export async function test_api_product_inquiry_detail_public_and_private_access_control(
  connection: api.IConnection,
) {
  // 1. Admin sign up
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admintest",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Admin creates channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Admin creates section
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Admin creates category
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Admin creates product
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerId, // can be random, as scenario only focuses on inquiry/customer flows
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

  // 6. Customer-A joins
  const customerEmailA = typia.random<string & tags.Format<"email">>();
  const customerA = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmailA,
      name: RandomGenerator.name(),
      password: "useratest",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerA);
  const customerAId = customerA.id;

  // 7. Customer-B joins for privacy test
  const customerEmailB = typia.random<string & tags.Format<"email">>();
  const customerB = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmailB,
      name: RandomGenerator.name(),
      password: "userbtest",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerB);

  // 8. Customer-A creates inquiries: public and private
  const publicInquiry =
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
  typia.assert(publicInquiry);
  TestValidator.equals(
    "public inquiry is_private is false",
    publicInquiry.is_private,
    false,
  );
  TestValidator.equals(
    "public inquiry author",
    publicInquiry.shopping_mall_customer_id,
    customerAId,
  );

  const privateInquiry =
    await api.functional.shoppingMall.customer.products.inquiries.create(
      connection,
      {
        productId: product.id,
        body: {
          body: RandomGenerator.paragraph(),
          is_private: true,
          title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallProductInquiry.ICreate,
      },
    );
  typia.assert(privateInquiry);
  TestValidator.equals(
    "private inquiry is_private is true",
    privateInquiry.is_private,
    true,
  );
  TestValidator.equals(
    "private inquiry author",
    privateInquiry.shopping_mall_customer_id,
    customerAId,
  );

  // 9. Customer-A retrieves both inquiries (should both succeed)
  {
    const readPub =
      await api.functional.shoppingMall.customer.products.inquiries.at(
        connection,
        {
          productId: product.id,
          inquiryId: publicInquiry.id,
        },
      );
    typia.assert(readPub);
    TestValidator.equals(
      "public inquiry body matches",
      readPub.body,
      publicInquiry.body,
    );
    TestValidator.equals(
      "public inquiry customer id",
      readPub.shopping_mall_customer_id,
      customerAId,
    );
    TestValidator.equals(
      "public inquiry is_private correct",
      readPub.is_private,
      false,
    );

    const readPriv =
      await api.functional.shoppingMall.customer.products.inquiries.at(
        connection,
        {
          productId: product.id,
          inquiryId: privateInquiry.id,
        },
      );
    typia.assert(readPriv);
    TestValidator.equals(
      "private inquiry body matches",
      readPriv.body,
      privateInquiry.body,
    );
    TestValidator.equals(
      "private inquiry customer id",
      readPriv.shopping_mall_customer_id,
      customerAId,
    );
    TestValidator.equals(
      "private inquiry is_private correct",
      readPriv.is_private,
      true,
    );
  }

  // 10. Switch context to Customer-B (simulate login by setting credentials)
  await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmailB,
      name: customerB.name,
      password: "userbtest",
    } satisfies IShoppingMallCustomer.IJoin,
  });

  // 11. Customer-B retrieves Customer-A's public inquiry (should succeed)
  const readPubByB =
    await api.functional.shoppingMall.customer.products.inquiries.at(
      connection,
      {
        productId: product.id,
        inquiryId: publicInquiry.id,
      },
    );
  typia.assert(readPubByB);
  TestValidator.equals(
    "other user public inquiry can be read",
    readPubByB.id,
    publicInquiry.id,
  );
  TestValidator.equals(
    "public inquiry is_private is false for other user",
    readPubByB.is_private,
    false,
  );

  // 12. Customer-B tries to retrieve Customer-A's private inquiry (should fail)
  await TestValidator.error(
    "other user cannot read private inquiry",
    async () => {
      await api.functional.shoppingMall.customer.products.inquiries.at(
        connection,
        {
          productId: product.id,
          inquiryId: privateInquiry.id,
        },
      );
    },
  );

  // 13. Field-level checks for privacy: seller fields, deleted_at, author id presence
  TestValidator.equals(
    "public inquiry does not set deleted_at",
    publicInquiry.deleted_at,
    null,
  );
  TestValidator.equals(
    "private inquiry does not set deleted_at",
    privateInquiry.deleted_at,
    null,
  );
  TestValidator.equals(
    "public inquiry no seller author",
    publicInquiry.shopping_mall_seller_id,
    null,
  );
  TestValidator.equals(
    "private inquiry no seller author",
    privateInquiry.shopping_mall_seller_id,
    null,
  );

  // 14. Attempt to read a non-existent inquiry
  await TestValidator.error(
    "read non-existent inquiry should fail",
    async () => {
      await api.functional.shoppingMall.customer.products.inquiries.at(
        connection,
        {
          productId: product.id,
          inquiryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
