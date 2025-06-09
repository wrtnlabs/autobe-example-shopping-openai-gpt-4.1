import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAnalyticsAiProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsAiProvider";

export async function test_api_aiProvider_putById(connection: api.IConnection) {
  const output: IAnalyticsAiProvider = await api.functional.aiProvider.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IAnalyticsAiProvider.IUpdate>(),
    },
  );
  typia.assert(output);
}
