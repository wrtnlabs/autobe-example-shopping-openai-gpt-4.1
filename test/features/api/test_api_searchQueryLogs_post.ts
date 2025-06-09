import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ISearchQueryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ISearchQueryLog";

export async function test_api_searchQueryLogs_post(
  connection: api.IConnection,
) {
  const output: ISearchQueryLog = await api.functional.searchQueryLogs.post(
    connection,
    {
      body: typia.random<ISearchQueryLog.ICreate>(),
    },
  );
  typia.assert(output);
}
