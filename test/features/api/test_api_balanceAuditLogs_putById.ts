import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IBalanceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IBalanceAuditLog";

export async function test_api_balanceAuditLogs_putById(
  connection: api.IConnection,
) {
  const output: IBalanceAuditLog =
    await api.functional.balanceAuditLogs.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IBalanceAuditLog.IUpdate>(),
    });
  typia.assert(output);
}
