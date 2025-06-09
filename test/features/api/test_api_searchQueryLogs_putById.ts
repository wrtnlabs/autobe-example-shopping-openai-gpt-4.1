import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ISearchQueryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ISearchQueryLog";

export async function test_api_searchQueryLogs_putById(
  connection: api.IConnection,
) {
  const output: ISearchQueryLog = await api.functional.searchQueryLogs.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ISearchQueryLog.IUpdate>(),
    },
  );
  typia.assert(output);
}
