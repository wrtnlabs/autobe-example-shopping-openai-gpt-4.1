import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavoriteFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteFolder";
import type { IPageIShoppingMallAiBackendFavoriteFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendFavoriteFolder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_favorite_folder_search_pagination_and_filtering(
  connection: api.IConnection,
) {
  /**
   * E2E test for searching, filtering, paginating customer's favorite folders.
   *
   * 1. Register and authenticate as a new customer.
   * 2. Create multiple favorite folders for this customer (owned by the same
   *    account).
   * 3. Test listing all folders (pagination, filtering by name, creation date,
   *    etc.).
   * 4. Test sort order, invalid/edge filter values, and pagination error cases.
   * 5. Assert only this customer's folders are listed and validate all DTO/type
   *    expectations.
   */

  // 1. Customer Registration
  const email = typia.random<string & tags.Format<"email">>();
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email,
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const joinResp = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(joinResp);
  const customer = joinResp.customer;

  // 2. Create favorite folders (5 total)
  const createdFolders: IShoppingMallAiBackendFavoriteFolder[] = [];
  for (let i = 0; i < 5; ++i) {
    const body: IShoppingMallAiBackendFavoriteFolder.ICreate = {
      name: `Folder ${RandomGenerator.paragraph({ sentences: 2 })} ${i}`,
      description: RandomGenerator.paragraph({ sentences: 4 }),
    };
    const folder =
      await api.functional.shoppingMallAiBackend.customer.favoriteFolders.createFavoriteFolder(
        connection,
        { body },
      );
    typia.assert(folder);
    createdFolders.push(folder);
  }

  // 3a. Default/no filter: should return all non-deleted folders paginated
  const resp1 =
    await api.functional.shoppingMallAiBackend.customer.favoriteFolders.indexFavoriteFolders(
      connection,
      {
        body: {} satisfies IShoppingMallAiBackendFavoriteFolder.IRequest,
      },
    );
  typia.assert(resp1);
  TestValidator.predicate(
    "all returned favorite folders belong to the current customer",
    resp1.data.every((f) => createdFolders.some((cf) => cf.id === f.id)),
  );

  // 3b. Name filter (partial match)
  const nameTarget = createdFolders[2].name.substring(0, 5);
  const resp2 =
    await api.functional.shoppingMallAiBackend.customer.favoriteFolders.indexFavoriteFolders(
      connection,
      {
        body: {
          name: nameTarget,
        } satisfies IShoppingMallAiBackendFavoriteFolder.IRequest,
      },
    );
  typia.assert(resp2);
  TestValidator.predicate(
    "name filter returns only matches",
    resp2.data.every((f) => f.name.includes(nameTarget)),
  );

  // 3c. Description filter – not possible (field not in IRequest), so skip
  // (This test is intentionally omitted: description search cannot be implemented)

  // 3d. created_from / created_to filter: boundaries
  const from = createdFolders[1].created_at;
  const to = createdFolders[4].created_at;
  const resp4 =
    await api.functional.shoppingMallAiBackend.customer.favoriteFolders.indexFavoriteFolders(
      connection,
      {
        body: {
          created_from: from,
          created_to: to,
        } satisfies IShoppingMallAiBackendFavoriteFolder.IRequest,
      },
    );
  typia.assert(resp4);
  TestValidator.predicate(
    "created_from/to filters restrict to correct range",
    resp4.data.every((f) => f.created_at >= from && f.created_at <= to),
  );

  // 3e. Pagination (limit/page)
  const limit = 2;
  const page = 2;
  const resp5 =
    await api.functional.shoppingMallAiBackend.customer.favoriteFolders.indexFavoriteFolders(
      connection,
      {
        body: {
          limit,
          page,
        } satisfies IShoppingMallAiBackendFavoriteFolder.IRequest,
      },
    );
  typia.assert(resp5);
  TestValidator.equals(
    "pagination: correct limit",
    resp5.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "pagination: correct page",
    resp5.pagination.current,
    page,
  );
  TestValidator.predicate(
    "pagination: no more than limit entries",
    resp5.data.length <= limit,
  );

  // 3f. Sorting by name and created_at, asc/desc
  const sorts = [
    ["name", "asc"],
    ["name", "desc"],
    ["created_at", "asc"],
    ["created_at", "desc"],
  ] as const;
  for (const [sortField, order] of sorts) {
    const resp =
      await api.functional.shoppingMallAiBackend.customer.favoriteFolders.indexFavoriteFolders(
        connection,
        {
          body: {
            sort: sortField,
            order,
          } satisfies IShoppingMallAiBackendFavoriteFolder.IRequest,
        },
      );
    typia.assert(resp);
    const sorted = [...resp.data].sort((a, b) => {
      if (sortField === "name")
        return (order === "asc" ? 1 : -1) * a.name.localeCompare(b.name);
      if (sortField === "created_at")
        return (
          (order === "asc" ? 1 : -1) * a.created_at.localeCompare(b.created_at)
        );
      return 0;
    });
    TestValidator.equals(
      `sort by ${sortField} ${order} gives correct order`,
      resp.data.map((f) => f.id),
      sorted.map((f) => f.id),
    );
  }

  // 3g. Out-of-range page number test
  await TestValidator.error(
    "out-of-range page returns empty or throws",
    async () => {
      const out =
        await api.functional.shoppingMallAiBackend.customer.favoriteFolders.indexFavoriteFolders(
          connection,
          {
            body: {
              page: 999,
              limit: 5,
            } satisfies IShoppingMallAiBackendFavoriteFolder.IRequest,
          },
        );
      TestValidator.equals("empty result page", out.data.length, 0);
    },
  );

  // Negative page/limit values should error
  for (const key of ["page", "limit"] as const) {
    await TestValidator.error(`negative ${key} should error`, async () => {
      await api.functional.shoppingMallAiBackend.customer.favoriteFolders.indexFavoriteFolders(
        connection,
        {
          body: { [key]: -1 } as any,
        },
      );
    });
  }

  // 3h. Named search for non-existent folder
  const resp8 =
    await api.functional.shoppingMallAiBackend.customer.favoriteFolders.indexFavoriteFolders(
      connection,
      {
        body: {
          name: "NOFOLDERLIKETHISNAME",
        } satisfies IShoppingMallAiBackendFavoriteFolder.IRequest,
      },
    );
  typia.assert(resp8);
  TestValidator.equals("search not found returns empty", resp8.data.length, 0);
  // No test for deleted folders due to lack of deletion support in given API
}
