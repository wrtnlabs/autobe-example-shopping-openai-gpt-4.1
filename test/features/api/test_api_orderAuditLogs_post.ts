import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IOrderAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrderAuditLog";

export async function test_api_orderAuditLogs_post(
  connection: api.IConnection,
) {
  const output: IOrderAuditLog = await api.functional.orderAuditLogs.post(
    connection,
    {
      body: typia.random<IOrderAuditLog.ICreate>(),
    },
  );
  typia.assert(output);
}
