import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAnalyticsDashboard";
import { IAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsDashboard";

export async function test_api_analyticsDashboard_patch(
  connection: api.IConnection,
) {
  const output: IPageIAnalyticsDashboard =
    await api.functional.analyticsDashboard.patch(connection, {
      body: typia.random<IAnalyticsDashboard.IRequest>(),
    });
  typia.assert(output);
}
