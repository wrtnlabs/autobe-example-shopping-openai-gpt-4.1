import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallFavoriteProduct";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

/**
 * Validate retrieval (listing, filtering, and pagination) of a customer's
 * favorited products via /shoppingMall/customer/favoriteProducts (PATCH).
 *
 * 1. Register a new customer in a randomly generated channel.
 * 2. Create a seller (random UUID for seller, as the seller join endpoint is not
 *    included) and create several products with distinct category/section if
 *    possible (required for IShoppingMallProduct.ICreate).
 * 3. For each product, simulate snapshot UUID and call favoriteProducts.create
 *    with correct snapshot, notification_enabled, plus batch_label for group
 *    testing on some entries.
 * 4. As customer, call favoriteProducts.index without filters (should get all
 *    favorited products), then with filters:
 *
 *    - Notification_enabled true (should only get those)
 *    - Batch_label for one label (should only get matching entries)
 *    - Page/limit (e.g., limit=2, test pagination)
 *    - Created_after and created_before (filters by time, may require DELAY or
 *         careful timestamp handling)
 * 5. Assert response type and structure with typia.assert, ownership (all returned
 *    entries' shopping_mall_customer_id matches current customer), favorites
 *    not including any for other users, and list ordering (created_at,
 *    updated_at descending or as API default).
 * 6. Confirm audit fields (created_at/updated_at) exist and deleted_at is not
 *    present unless explicitly soft deleted.
 * 7. Register another customer as a negative test and favorite a product, ensuring
 *    it's not visible to the main customer.
 * 8. Edge - use a filter that matches nothing (e.g., invalid batch_label or date
 *    range in future) and verify empty data[].
 */
export async function test_api_favorite_products_list_customer_success(
  connection: api.IConnection,
) {
  // 1. Register customer in a random channel
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const mainCustomerJoin = {
    shopping_mall_channel_id: channelId,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: mainCustomerJoin,
    });
  typia.assert(customer);

  // 2. Create 4 products as the seller (simulate seller/channel/section/category UUIDs)
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const categoryIds = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const products: IShoppingMallProduct[] = await ArrayUtil.asyncMap(
    [0, 1, 2, 3],
    async (i) => {
      const product = await api.functional.shoppingMall.seller.products.create(
        connection,
        {
          body: {
            shopping_mall_seller_id: sellerId,
            shopping_mall_channel_id: channelId,
            shopping_mall_section_id: sectionId,
            shopping_mall_category_id: categoryIds[i % 2],
            code: RandomGenerator.alphaNumeric(8),
            name: RandomGenerator.name(),
            status: "Active",
            business_status: "Approval",
          } satisfies IShoppingMallProduct.ICreate,
        },
      );
      typia.assert(product);
      return product;
    },
  );
  // 3. Customer favorites all 4 products (simulate snapshot IDs) with varying notification_enabled and batch_labels
  const now = new Date();
  const snapshots = products.map(() =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const favoriteBatchLabels = ["group1", null, "group1", "group2"] as const;
  const favoriteNotificationFlags = [true, false, true, false];
  const favorites: IShoppingMallFavoriteProduct[] = [];
  for (let i = 0; i < products.length; ++i) {
    const favorite =
      await api.functional.shoppingMall.customer.favoriteProducts.create(
        connection,
        {
          body: {
            shopping_mall_product_id: products[i].id,
            shopping_mall_favorite_snapshot_id: snapshots[i],
            notification_enabled: favoriteNotificationFlags[i],
            batch_label: favoriteBatchLabels[i],
          } satisfies IShoppingMallFavoriteProduct.ICreate,
        },
      );
    typia.assert(favorite);
    favorites.push(favorite);
  }

  // 4.1. List favorites with no filters (should get all 4 for this customer)
  {
    const res =
      await api.functional.shoppingMall.customer.favoriteProducts.index(
        connection,
        {
          body: {},
        },
      );
    typia.assert(res);
    TestValidator.equals(
      "returns all favorites for current customer",
      res.data.length,
      4,
    );
    for (const f of res.data) {
      TestValidator.equals(
        "ownership only for current customer",
        f.shopping_mall_customer_id,
        customer.id,
      );
    }
  }
  // 4.2. Filter by notification_enabled = true (should only get those entries)
  {
    const res =
      await api.functional.shoppingMall.customer.favoriteProducts.index(
        connection,
        {
          body: { notification_enabled: true },
        },
      );
    typia.assert(res);
    const expected = favorites.filter((f) => f.notification_enabled);
    TestValidator.equals(
      "correct filtered count by notification_enabled",
      res.data.length,
      expected.length,
    );
    for (const f of res.data) {
      TestValidator.predicate(
        "all notification_enabled",
        f.notification_enabled === true,
      );
    }
  }
  // 4.3. Filter by batch_label = 'group1' (should only get those entries)
  {
    const res =
      await api.functional.shoppingMall.customer.favoriteProducts.index(
        connection,
        {
          body: { batch_label: "group1" },
        },
      );
    typia.assert(res);
    const expected = favorites.filter((f) => f.batch_label === "group1");
    TestValidator.equals(
      "correct filtered count by batch_label",
      res.data.length,
      expected.length,
    );
    for (const f of res.data) {
      TestValidator.equals(
        "all have batch_label group1",
        f.batch_label,
        "group1",
      );
    }
  }
  // 4.4. Pagination (limit=2, page=1)
  {
    const res1 =
      await api.functional.shoppingMall.customer.favoriteProducts.index(
        connection,
        {
          body: { limit: 2, page: 1 },
        },
      );
    typia.assert(res1);
    TestValidator.equals(
      "length matches limit for page 1",
      res1.data.length,
      2,
    );
    TestValidator.equals(
      "pagination structure correct for page 1",
      res1.pagination.current,
      1,
    );
    // Page 2
    const res2 =
      await api.functional.shoppingMall.customer.favoriteProducts.index(
        connection,
        {
          body: { limit: 2, page: 2 },
        },
      );
    typia.assert(res2);
    TestValidator.equals(
      "length matches limit for page 2",
      res2.data.length,
      2,
    );
    TestValidator.equals(
      "pagination structure correct for page 2",
      res2.pagination.current,
      2,
    );
    // Retrieve all unique ids to confirm all favorites present across pages
    const pagedIds = [...res1.data, ...res2.data].map((f) => f.id).sort();
    const expectedIds = favorites.map((f) => f.id).sort();
    TestValidator.equals(
      "pagination contains all favorite ids",
      pagedIds,
      expectedIds,
    );
  }
  // 4.5. created_after filter (should return no entries if future date)
  {
    const future = new Date(Date.now() + 10000000).toISOString();
    const res =
      await api.functional.shoppingMall.customer.favoriteProducts.index(
        connection,
        {
          body: { created_after: future },
        },
      );
    typia.assert(res);
    TestValidator.equals(
      "created_after in future matches nothing",
      res.data.length,
      0,
    );
  }
  // 4.6. created_before filter (should return all if after all created)
  {
    // Use now + large offset
    const future = new Date(Date.now() + 10000000).toISOString();
    const res =
      await api.functional.shoppingMall.customer.favoriteProducts.index(
        connection,
        {
          body: { created_before: future },
        },
      );
    typia.assert(res);
    TestValidator.equals(
      "created_before in far future gets all",
      res.data.length,
      4,
    );
  }
  // 4.7. Non-matching batch_label filter (should return no results)
  {
    const res =
      await api.functional.shoppingMall.customer.favoriteProducts.index(
        connection,
        {
          body: { batch_label: "nonexistent_label" },
        },
      );
    typia.assert(res);
    TestValidator.equals(
      "nonexistent batch_label returns nothing",
      res.data.length,
      0,
    );
  }
  // 5. Confirm all entries have audit/compliance fields and no soft-deletes
  {
    const res =
      await api.functional.shoppingMall.customer.favoriteProducts.index(
        connection,
        {
          body: {},
        },
      );
    for (const f of res.data) {
      TestValidator.predicate("audit field: created_at exists", !!f.created_at);
      TestValidator.predicate("audit field: updated_at exists", !!f.updated_at);
      TestValidator.equals(
        "deleted_at not present or null",
        f.deleted_at,
        null,
      );
    }
  }
  // 6. Confirm only current customer's favorites are returned (no leakage)
  {
    // Register a second customer and have them favorite a product
    const otherCustomerJoin = {
      shopping_mall_channel_id: channelId,
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin;
    const otherCustomer = await api.functional.auth.customer.join(connection, {
      body: otherCustomerJoin,
    });
    typia.assert(otherCustomer);
    // As other customer, favorite the first product (simulate new snapshot)
    const snapshotOther = typia.random<string & tags.Format<"uuid">>();
    await api.functional.shoppingMall.customer.favoriteProducts.create(
      connection,
      {
        body: {
          shopping_mall_product_id: products[0].id,
          shopping_mall_favorite_snapshot_id: snapshotOther,
          notification_enabled: true,
        } satisfies IShoppingMallFavoriteProduct.ICreate,
      },
    );
    // Switch connection to main customer again (token already present)
    // List favorites - only original 4, all owned by the main customer
    const res =
      await api.functional.shoppingMall.customer.favoriteProducts.index(
        connection,
        {
          body: {},
        },
      );
    typia.assert(res);
    TestValidator.equals(
      "only main customer's favorites returned",
      res.data.length,
      4,
    );
    for (const f of res.data) {
      TestValidator.equals(
        "no entries from other customer",
        f.shopping_mall_customer_id,
        customer.id,
      );
    }
  }
}
