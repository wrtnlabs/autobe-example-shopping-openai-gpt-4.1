import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAnalyticsAiLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsAiLog";

export async function test_api_aiLog_post(connection: api.IConnection) {
  const output: IAnalyticsAiLog = await api.functional.aiLog.post(connection, {
    body: typia.random<IAnalyticsAiLog.ICreate>(),
  });
  typia.assert(output);
}
