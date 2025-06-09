import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAnalyticsAiLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsAiLog";

export async function test_api_aiLog_putById(connection: api.IConnection) {
  const output: IAnalyticsAiLog = await api.functional.aiLog.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IAnalyticsAiLog.IUpdate>(),
    },
  );
  typia.assert(output);
}
