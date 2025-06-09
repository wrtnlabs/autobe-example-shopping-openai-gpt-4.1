import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsDashboard";

export async function test_api_analyticsDashboard_eraseById(
  connection: api.IConnection,
) {
  const output: IAnalyticsDashboard =
    await api.functional.analyticsDashboard.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
