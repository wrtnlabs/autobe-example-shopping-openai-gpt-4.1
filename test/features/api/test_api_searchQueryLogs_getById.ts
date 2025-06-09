import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ISearchQueryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ISearchQueryLog";

export async function test_api_searchQueryLogs_getById(
  connection: api.IConnection,
) {
  const output: ISearchQueryLog = await api.functional.searchQueryLogs.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
