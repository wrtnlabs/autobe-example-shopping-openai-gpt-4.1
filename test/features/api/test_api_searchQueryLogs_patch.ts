import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageISearchQueryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageISearchQueryLog";
import { ISearchQueryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ISearchQueryLog";

export async function test_api_searchQueryLogs_patch(
  connection: api.IConnection,
) {
  const output: IPageISearchQueryLog =
    await api.functional.searchQueryLogs.patch(connection, {
      body: typia.random<ISearchQueryLog.IRequest>(),
    });
  typia.assert(output);
}
