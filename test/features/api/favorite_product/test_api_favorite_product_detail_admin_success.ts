import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

/**
 * Validate the admin's access to detailed favorite product information for any
 * user.
 *
 * 1. Register a new admin - obtain admin token.
 * 2. Register a customer account - obtain customer token and channel id.
 * 3. As (faked) seller, create a product (generate valid UUIDs for seller,
 *    channel, section, category).
 * 4. As customer, favorite the product (generate valid snapshot id for required
 *    DTO input).
 * 5. As admin, access favorite product detail by favoriteProductId; assert all
 *    meta, snapshot, and audit fields are present and values match what was
 *    stored.
 * 6. As customer (non-admin), attempt the same favoriteProducts.at access and
 *    confirm access is denied.
 * 7. As admin, try to access non-existent/deleted favoriteProductId and ensure
 *    error is returned.
 */
export async function test_api_favorite_product_detail_admin_success(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customerEmail,
      password: "1234",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 3. (Faked) seller/product creation (generate seller/channel/section/category UUIDs)
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Use admin account (can be used to create product if needed, or just use valid UUIDs)
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerId,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        shopping_mall_category_id: categoryId,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        status: "Active",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. As customer, create favorite (snapshot id must be a valid uuid - generated)
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Switch to customer auth
  await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customerEmail,
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const favorite =
    await api.functional.shoppingMall.customer.favoriteProducts.create(
      connection,
      {
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_favorite_snapshot_id: snapshotId,
          notification_enabled: true,
          batch_label: RandomGenerator.name(),
        } satisfies IShoppingMallFavoriteProduct.ICreate,
      },
    );
  typia.assert(favorite);

  // 5. As admin, access the favorite product info
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "1234",
      name: admin.name,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const got = await api.functional.shoppingMall.admin.favoriteProducts.at(
    connection,
    {
      favoriteProductId: favorite.id,
    },
  );
  typia.assert(got);
  TestValidator.equals(
    "admin can view favorite with full information",
    got,
    favorite,
    (key) =>
      key === "updated_at" || key === "created_at" || key === "deleted_at",
  );

  // 6. As customer (non-admin), try to access admin endpoint - should fail
  await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customerEmail,
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  await TestValidator.error(
    "non-admin cannot access admin favorite product detail",
    async () => {
      await api.functional.shoppingMall.admin.favoriteProducts.at(connection, {
        favoriteProductId: favorite.id,
      });
    },
  );

  // 7. Try admin fetch with invalid favoriteProductId
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "1234",
      name: admin.name,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  await TestValidator.error(
    "admin gets error for non-existent favoriteProductId",
    async () => {
      await api.functional.shoppingMall.admin.favoriteProducts.at(connection, {
        favoriteProductId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
