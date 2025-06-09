import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIMetricExport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMetricExport";
import { IMetricExport } from "@ORGANIZATION/PROJECT-api/lib/structures/IMetricExport";

export async function test_api_metricExport_patch(connection: api.IConnection) {
  const output: IPageIMetricExport = await api.functional.metricExport.patch(
    connection,
    {
      body: typia.random<IMetricExport.IRequest>(),
    },
  );
  typia.assert(output);
}
