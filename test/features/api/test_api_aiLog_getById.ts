import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAnalyticsAiLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsAiLog";

export async function test_api_aiLog_getById(connection: api.IConnection) {
  const output: IAnalyticsAiLog = await api.functional.aiLog.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
