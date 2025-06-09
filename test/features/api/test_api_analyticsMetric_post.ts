import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAnalyticsMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsMetric";

export async function test_api_analyticsMetric_post(
  connection: api.IConnection,
) {
  const output: IAnalyticsMetric = await api.functional.analyticsMetric.post(
    connection,
    {
      body: typia.random<IAnalyticsMetric.ICreate>(),
    },
  );
  typia.assert(output);
}
