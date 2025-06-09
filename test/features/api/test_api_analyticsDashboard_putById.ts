import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsDashboard";

export async function test_api_analyticsDashboard_putById(
  connection: api.IConnection,
) {
  const output: IAnalyticsDashboard =
    await api.functional.analyticsDashboard.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IAnalyticsDashboard.IUpdate>(),
    });
  typia.assert(output);
}
