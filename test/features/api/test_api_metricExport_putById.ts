import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IMetricExport } from "@ORGANIZATION/PROJECT-api/lib/structures/IMetricExport";

export async function test_api_metricExport_putById(
  connection: api.IConnection,
) {
  const output: IMetricExport = await api.functional.metricExport.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IMetricExport.IUpdate>(),
    },
  );
  typia.assert(output);
}
