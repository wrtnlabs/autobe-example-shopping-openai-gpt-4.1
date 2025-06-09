import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IBalanceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IBalanceAuditLog";

export async function test_api_balanceAuditLogs_post(
  connection: api.IConnection,
) {
  const output: IBalanceAuditLog = await api.functional.balanceAuditLogs.post(
    connection,
    {
      body: typia.random<IBalanceAuditLog.ICreate>(),
    },
  );
  typia.assert(output);
}
