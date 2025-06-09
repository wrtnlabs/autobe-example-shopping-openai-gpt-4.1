import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAnalyticsMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsMetric";

export async function test_api_analyticsMetric_eraseById(
  connection: api.IConnection,
) {
  const output: IAnalyticsMetric =
    await api.functional.analyticsMetric.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
