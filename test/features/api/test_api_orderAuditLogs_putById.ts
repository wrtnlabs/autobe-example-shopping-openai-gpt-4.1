import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IOrderAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrderAuditLog";

export async function test_api_orderAuditLogs_putById(
  connection: api.IConnection,
) {
  const output: IOrderAuditLog = await api.functional.orderAuditLogs.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IOrderAuditLog.IUpdate>(),
    },
  );
  typia.assert(output);
}
