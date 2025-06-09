import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IMetricExport } from "@ORGANIZATION/PROJECT-api/lib/structures/IMetricExport";

export async function test_api_metricExport_eraseById(
  connection: api.IConnection,
) {
  const output: IMetricExport = await api.functional.metricExport.eraseById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
