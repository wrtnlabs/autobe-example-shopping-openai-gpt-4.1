import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAnalyticsAiProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsAiProvider";

export async function test_api_aiProvider_post(connection: api.IConnection) {
  const output: IAnalyticsAiProvider = await api.functional.aiProvider.post(
    connection,
    {
      body: typia.random<IAnalyticsAiProvider.ICreate>(),
    },
  );
  typia.assert(output);
}
