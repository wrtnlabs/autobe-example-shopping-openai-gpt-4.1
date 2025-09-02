import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoin";
import type { IPageIShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCoin";
import type { IPage_IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage_IPagination";

export async function test_api_admin_coin_search_success(
  connection: api.IConnection,
) {
  /**
   * Validate admin coin wallet search with advanced filters and pagination.
   *
   * Steps:
   *
   * 1. Register a new admin and ensure authentication/authorization context is
   *    set.
   * 2. Search for coin wallets with no filters (should return at least one page,
   *    possibly empty set, but valid structure).
   * 3. Search using customer or seller owner filters (randomly pick one type from
   *    available wallet owner fields).
   * 4. Search using min/max usable_coin values for range-based filtering.
   * 5. Search using created_from and created_to (date range filtering).
   * 6. Use pagination parameters (page, limit) and check result/page info is
   *    respected.
   * 7. Log out (remove admin Authorization), try search again and verify access is
   *    denied.
   */

  // 1. Register a new admin account and get admin context (Authorization header will be set via SDK)
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminEmail = `${adminUsername}@company.com`;
  const joinOutput = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: adminEmail,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(joinOutput);
  TestValidator.equals(
    "join returned admin username",
    joinOutput.admin.username,
    adminUsername,
  );
  TestValidator.equals(
    "join returned admin email",
    joinOutput.admin.email,
    adminEmail,
  );
  TestValidator.predicate(
    "Authorization header is set",
    !!connection.headers?.Authorization,
  );

  // 2. Search all coins wallets, no filters
  const allCoinsResponse =
    await api.functional.shoppingMallAiBackend.admin.coins.index(connection, {
      body: {},
    });
  typia.assert(allCoinsResponse);
  TestValidator.predicate(
    "pagination data structure present (all coin search)",
    !!allCoinsResponse.pagination && Array.isArray(allCoinsResponse.data),
  );

  // Save some sample wallet/candidate ids for filtering
  const firstWallet = allCoinsResponse.data[0];
  let customerId: string | undefined = undefined;
  let sellerId: string | undefined = undefined;
  if (firstWallet) {
    if (firstWallet.shopping_mall_ai_backend_customer_id)
      customerId = firstWallet.shopping_mall_ai_backend_customer_id;
    if (firstWallet.shopping_mall_ai_backend_seller_id)
      sellerId = firstWallet.shopping_mall_ai_backend_seller_id;
  }

  // 3. Owner filter: customer_id
  if (customerId) {
    const byCustomer =
      await api.functional.shoppingMallAiBackend.admin.coins.index(connection, {
        body: { shopping_mall_ai_backend_customer_id: customerId },
      });
    typia.assert(byCustomer);
    TestValidator.predicate(
      "all coin wallets for filter have correct customer id",
      byCustomer.data.every(
        (x) => x.shopping_mall_ai_backend_customer_id === customerId,
      ),
    );
  }
  // 3b. Owner filter: seller_id
  if (sellerId) {
    const bySeller =
      await api.functional.shoppingMallAiBackend.admin.coins.index(connection, {
        body: { shopping_mall_ai_backend_seller_id: sellerId },
      });
    typia.assert(bySeller);
    TestValidator.predicate(
      "all coin wallets for filter have correct seller id",
      bySeller.data.every(
        (x) => x.shopping_mall_ai_backend_seller_id === sellerId,
      ),
    );
  }

  // 4. Coin balance filters
  const coinsMinResp =
    await api.functional.shoppingMallAiBackend.admin.coins.index(connection, {
      body: { min_usable_coin: 0 }, // boundary: 0 usable coins
    });
  typia.assert(coinsMinResp);
  TestValidator.predicate(
    "all coins have at least min usable coins",
    coinsMinResp.data.every((x) => x.usable_coin >= 0),
  );
  const coinsMaxResp =
    await api.functional.shoppingMallAiBackend.admin.coins.index(connection, {
      body: { max_usable_coin: 1000000 }, // only wallets at or below this value
    });
  typia.assert(coinsMaxResp);
  TestValidator.predicate(
    "all coins have at most max usable coins",
    coinsMaxResp.data.every((x) => x.usable_coin <= 1000000),
  );

  // 5. Date range: created_from / created_to
  const nowIso = new Date().toISOString();
  const coinsSinceNow =
    await api.functional.shoppingMallAiBackend.admin.coins.index(connection, {
      body: { created_from: nowIso },
    });
  typia.assert(coinsSinceNow);
  TestValidator.predicate(
    "all coins created_at >= created_from",
    coinsSinceNow.data.every((x) => x.created_at >= nowIso),
  );

  // 6. Pagination (limit=1, page=1 then page=2)
  const page1 = await api.functional.shoppingMallAiBackend.admin.coins.index(
    connection,
    {
      body: { limit: 1, page: 1 },
    },
  );
  typia.assert(page1);
  TestValidator.equals("pagination page1 number", page1.pagination.current, 1);
  TestValidator.predicate(
    "at most one result on page1",
    page1.data.length <= 1,
  );
  if (page1.pagination.pages >= 2) {
    const page2 = await api.functional.shoppingMallAiBackend.admin.coins.index(
      connection,
      {
        body: { limit: 1, page: 2 },
      },
    );
    typia.assert(page2);
    TestValidator.equals(
      "pagination page2 number",
      page2.pagination.current,
      2,
    );
    TestValidator.predicate(
      "at most one result on page2",
      page2.data.length <= 1,
    );
  }

  // 7. Remove Authorization and check access denied (simulate unauthorized access)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "coin wallet search fails when not authenticated as admin",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coins.index(unauthConn, {
        body: {},
      });
    },
  );
}
