import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAnalyticsMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAnalyticsMetric";
import { IAnalyticsMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsMetric";

export async function test_api_analyticsMetric_patch(
  connection: api.IConnection,
) {
  const output: IPageIAnalyticsMetric =
    await api.functional.analyticsMetric.patch(connection, {
      body: typia.random<IAnalyticsMetric.IRequest>(),
    });
  typia.assert(output);
}
