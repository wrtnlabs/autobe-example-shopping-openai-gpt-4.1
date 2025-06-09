import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAnalyticsAiProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsAiProvider";

export async function test_api_aiProvider_getById(connection: api.IConnection) {
  const output: IAnalyticsAiProvider = await api.functional.aiProvider.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
