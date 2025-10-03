import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

/**
 * E2E test: customer can retrieve details for their specific favorited product
 *
 * This test implements the following full business workflow:
 *
 * 1. Register a new customer (using random email, password, channel id, name,
 *    phone)
 * 2. Register a new product as a seller (using random product,
 *    seller/channel/section/category id, code, name, statuses)
 * 3. Favorite the product as the customer, using the product id and a made-up
 *    snapshot id, enable notifications and assign a batch_label
 * 4. Retrieve the details for the favorited product by its ID using the customer
 *    detail endpoint
 * 5. Validate that the returned DTO has correct favorite ownership, correct
 *    references to customer_id/product_id/snapshot_id, accurate
 *    notification_enabled/batch_label/created/updated fields, and that
 *    deleted_at is null
 * 6. Negative: Check that fetching with a non-existent ID, or after soft-deleting
 *    (if allowed), returns an error (if error test is possible)
 *
 * Notes:
 *
 * - Only use DTO fields and SDK functions given above
 * - Do not test with invalid data types or intentionally omit required fields
 * - All null or optional fields must be handled per DTO definitions
 * - Negative cases only for runtime (not type) errors
 */
export async function test_api_favorite_product_detail_customer_success(
  connection: api.IConnection,
) {
  // 1. Customer register
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);

  // 2. Seller creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_channel_id: customerJoin.shopping_mall_channel_id,
        shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "Active",
        business_status: "Active",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Customer favorites the product (requires a snapshot id, we randomize a UUID)
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const favoriteCreated =
    await api.functional.shoppingMall.customer.favoriteProducts.create(
      connection,
      {
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_favorite_snapshot_id: snapshotId,
          notification_enabled: true,
          batch_label: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IShoppingMallFavoriteProduct.ICreate,
      },
    );
  typia.assert(favoriteCreated);

  // 4. Retrieve favorite product detail
  const favoriteDetail =
    await api.functional.shoppingMall.customer.favoriteProducts.at(connection, {
      favoriteProductId: favoriteCreated.id,
    });
  typia.assert(favoriteDetail);

  // 5. Validate DTO fields and ownership
  TestValidator.equals(
    "favorite id matches",
    favoriteDetail.id,
    favoriteCreated.id,
  );
  TestValidator.equals(
    "owner customer id matches",
    favoriteDetail.shopping_mall_customer_id,
    customerJoin.id,
  );
  TestValidator.equals(
    "favorite product id matches",
    favoriteDetail.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "snapshot id matches",
    favoriteDetail.shopping_mall_favorite_snapshot_id,
    snapshotId,
  );
  TestValidator.equals(
    "notification enabled true",
    favoriteDetail.notification_enabled,
    true,
  );
  TestValidator.equals(
    "batch label matches",
    favoriteDetail.batch_label,
    favoriteCreated.batch_label,
  );
  TestValidator.equals(
    "active favorite not soft deleted",
    favoriteDetail.deleted_at,
    null,
  );

  // 6. Negative: try getting with a non-existent id (should error)
  await TestValidator.error(
    "should throw on non-existent favoriteProductId",
    async () => {
      await api.functional.shoppingMall.customer.favoriteProducts.at(
        connection,
        {
          favoriteProductId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
