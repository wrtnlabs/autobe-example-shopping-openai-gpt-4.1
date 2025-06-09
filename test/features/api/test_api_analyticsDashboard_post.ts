import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsDashboard";

export async function test_api_analyticsDashboard_post(
  connection: api.IConnection,
) {
  const output: IAnalyticsDashboard =
    await api.functional.analyticsDashboard.post(connection, {
      body: typia.random<IAnalyticsDashboard.ICreate>(),
    });
  typia.assert(output);
}
