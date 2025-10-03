import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallFavoriteAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallFavoriteAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFavoriteAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteAddress";

/**
 * Test retrieving, filtering, and paginating favorite addresses for the
 * authenticated customer.
 *
 * 1. Register a new customer (unique channel/customer combo).
 * 2. Add multiple favorite addresses with different notification_enabled and
 *    batch_label values (including null/undefined).
 * 3. Exercise retrieval API with different requests:
 *
 *    - No filter (should get all for that user, paginated)
 *    - Filter by notification_enabled true/false
 *    - Filter by specific batch_label (string), by batch_label=null, by batch_label
 *         undefined
 *    - Request with pagination (pages/limit)
 *    - Request with sort if supported
 * 4. Validate results:
 *
 *    - Only own addresses returned (not deleted; customer_id matches session)
 *    - Filtering respects notification setting and label, including null/undefined
 *         vs. string
 *    - Pagination meta fields accurate
 * 5. Negative checks:
 *
 *    - Calling with unauthenticated connection should fail
 *    - Invalid filters (e.g., outrageous page/limit) should error or return empty
 *         results.
 */
export async function test_api_favorite_address_list_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new customer and authenticate
  const joinInput = {
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const auth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinInput });
  typia.assert(auth);
  // 2. Create a number of favorite addresses for this customer.
  // We'll generate random address IDs to simulate real address references.
  const addressCount = 9;
  const notificationPattern = [true, false];
  const batchLabels = ["vip", "regular", null, undefined];
  const createdFavorites: IShoppingMallFavoriteAddress[] = [];
  for (let i = 0; i < addressCount; ++i) {
    const favCreate = {
      shopping_mall_address_id: typia.random<string & tags.Format<"uuid">>(),
      notification_enabled: notificationPattern[i % notificationPattern.length],
      batch_label: batchLabels[i % batchLabels.length],
    } satisfies IShoppingMallFavoriteAddress.ICreate;
    const favorite =
      await api.functional.shoppingMall.customer.favoriteAddresses.create(
        connection,
        { body: favCreate },
      );
    typia.assert(favorite);
    createdFavorites.push(favorite);
  }
  // 3a. Retrieve all (no filters)
  let result =
    await api.functional.shoppingMall.customer.favoriteAddresses.index(
      connection,
      { body: {} },
    );
  typia.assert(result);
  TestValidator.predicate(
    "all created favorites are returned when no filters",
    result.data.length === createdFavorites.length,
  );
  // 3b. Filter by notification_enabled true/false
  for (const state of notificationPattern) {
    result = await api.functional.shoppingMall.customer.favoriteAddresses.index(
      connection,
      { body: { notification_enabled: state } },
    );
    typia.assert(result);
    const expected = createdFavorites.filter(
      (f) => f.notification_enabled === state,
    );
    TestValidator.equals(
      `favorites notification_enabled=${state} filter`,
      result.data.length,
      expected.length,
    );
    for (const fav of result.data) {
      TestValidator.equals(
        `favorite notification_enabled matches filter (${state})`,
        fav.notification_enabled,
        state,
      );
    }
  }
  // 3c. Filter by batch_label (string, null, undefined)
  for (const label of batchLabels) {
    result = await api.functional.shoppingMall.customer.favoriteAddresses.index(
      connection,
      { body: { batch_label: label } },
    );
    typia.assert(result);
    const expected = createdFavorites.filter((f) => f.batch_label === label);
    TestValidator.equals(
      `favorites batch_label=${String(label)} filter`,
      result.data.length,
      expected.length,
    );
    for (const fav of result.data) {
      TestValidator.equals(
        `favorite batch_label matches filter (${String(label)})`,
        fav.batch_label,
        label,
      );
    }
  }
  // 3d. Pagination tests
  const limit = 3;
  const page1 =
    await api.functional.shoppingMall.customer.favoriteAddresses.index(
      connection,
      {
        body: { limit, page: 1 },
      },
    );
  typia.assert(page1);
  TestValidator.equals("pagination page 1 count", page1.data.length, limit);
  TestValidator.equals(
    "pagination starts at page 1",
    page1.pagination.current,
    1,
  );

  const page2 =
    await api.functional.shoppingMall.customer.favoriteAddresses.index(
      connection,
      {
        body: { limit, page: 2 },
      },
    );
  typia.assert(page2);
  TestValidator.equals("pagination page 2 count", page2.data.length, limit);
  TestValidator.equals("pagination page 2", page2.pagination.current, 2);

  const page3 =
    await api.functional.shoppingMall.customer.favoriteAddresses.index(
      connection,
      {
        body: { limit, page: 3 },
      },
    );
  typia.assert(page3);
  // There may be fewer on last page
  TestValidator.predicate(
    "pagination page 3 count at most limit",
    page3.data.length <= limit,
  );
  TestValidator.equals("pagination page 3", page3.pagination.current, 3);

  // 3e. Negative filter scenario: page way out of bounds returns empty
  const outOfBounds =
    await api.functional.shoppingMall.customer.favoriteAddresses.index(
      connection,
      {
        body: { limit, page: 99 },
      },
    );
  typia.assert(outOfBounds);
  TestValidator.equals(
    "pagination out of bounds page count",
    outOfBounds.data.length,
    0,
  );
  TestValidator.equals(
    "pagination out of bounds page current",
    outOfBounds.pagination.current,
    99,
  );

  // 4. Unauthenticated call must fail
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated request to index should fail",
    async () => {
      await api.functional.shoppingMall.customer.favoriteAddresses.index(
        unauthenticatedConnection,
        { body: {} },
      );
    },
  );
}
