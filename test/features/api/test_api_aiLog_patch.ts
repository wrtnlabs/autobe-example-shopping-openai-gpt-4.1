import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAnalyticsAiLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAnalyticsAiLog";
import { IAnalyticsAiLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsAiLog";

export async function test_api_aiLog_patch(connection: api.IConnection) {
  const output: IPageIAnalyticsAiLog = await api.functional.aiLog.patch(
    connection,
    {
      body: typia.random<IAnalyticsAiLog.IRequest>(),
    },
  );
  typia.assert(output);
}
