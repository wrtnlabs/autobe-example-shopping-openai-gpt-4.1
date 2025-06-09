import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIBalanceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIBalanceAuditLog";
import { IBalanceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IBalanceAuditLog";

export async function test_api_balanceAuditLogs_patch(
  connection: api.IConnection,
) {
  const output: IPageIBalanceAuditLog =
    await api.functional.balanceAuditLogs.patch(connection, {
      body: typia.random<IBalanceAuditLog.IRequest>(),
    });
  typia.assert(output);
}
