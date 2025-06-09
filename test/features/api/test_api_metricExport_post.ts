import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IMetricExport } from "@ORGANIZATION/PROJECT-api/lib/structures/IMetricExport";

export async function test_api_metricExport_post(connection: api.IConnection) {
  const output: IMetricExport = await api.functional.metricExport.post(
    connection,
    {
      body: typia.random<IMetricExport.ICreate>(),
    },
  );
  typia.assert(output);
}
