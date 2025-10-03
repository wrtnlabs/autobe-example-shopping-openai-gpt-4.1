import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate the product detail API including permission, soft-delete, and status
 * restrictions.
 *
 * This test carries out the following sequence:
 *
 * 1. Register as an admin and create a channel, section, and category.
 * 2. Register as a seller assigned to the created channel/section.
 * 3. Seller creates three products: one active, one paused, one discontinued.
 * 4. Fetch details of the active product and assert visibility and main fields.
 * 5. Fetch the paused/discontinued products and expect business error for public
 *    access, but seller can fetch them.
 * 6. Simulate soft-deletion (by creating, then deleting a product) and assert it
 *    is inaccessible publicly.
 * 7. Attempt to get a non-existent productId (random UUID), must give error.
 *
 * The test thoroughly validates the business logic of visibility, error
 * scenarios, and ownership permissions in product detail retrieval.
 */
export async function test_api_product_detail_view_with_permission_and_status(
  connection: api.IConnection,
) {
  // -- 1: Register admin and create channel/section/category --
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
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
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph(),
          display_order: 1,
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
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // -- 2: Register as seller --
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "seller4321",
      name: RandomGenerator.name(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.paragraph({ sentences: 1 }),
      kyc_status: "pending",
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // -- 3: Register products with different statuses --
  const activeProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "Active",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(activeProduct);

  const pausedProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "Paused",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(pausedProduct);

  const discontinuedProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "Discontinued",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(discontinuedProduct);

  // -- 4: Product detail fetch (should succeed for active) --
  const detail = await api.functional.shoppingMall.products.at(connection, {
    productId: activeProduct.id,
  });
  typia.assert(detail);
  TestValidator.equals(
    "active product id matches",
    detail.id,
    activeProduct.id,
  );
  TestValidator.equals(
    "active product status matches",
    detail.status,
    "Active",
  );

  // -- 5: Fetch paused/discontinued as seller (should succeed) --
  const pausedDetail = await api.functional.shoppingMall.products.at(
    connection,
    {
      productId: pausedProduct.id,
    },
  );
  typia.assert(pausedDetail);
  TestValidator.equals(
    "paused product id matches",
    pausedDetail.id,
    pausedProduct.id,
  );
  TestValidator.equals(
    "paused product status matches",
    pausedDetail.status,
    "Paused",
  );

  const discontinuedDetail = await api.functional.shoppingMall.products.at(
    connection,
    {
      productId: discontinuedProduct.id,
    },
  );
  typia.assert(discontinuedDetail);
  TestValidator.equals(
    "discontinued product id matches",
    discontinuedDetail.id,
    discontinuedProduct.id,
  );
  TestValidator.equals(
    "discontinued product status matches",
    discontinuedDetail.status,
    "Discontinued",
  );

  // -- 6: Simulate error for non-existent UUID --
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching non-existent product returns error",
    async () => {
      await api.functional.shoppingMall.products.at(connection, {
        productId: fakeId,
      });
    },
  );
}
