import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIOrderAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOrderAuditLog";
import { IOrderAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrderAuditLog";

export async function test_api_orderAuditLogs_patch(
  connection: api.IConnection,
) {
  const output: IPageIOrderAuditLog = await api.functional.orderAuditLogs.patch(
    connection,
    {
      body: typia.random<IOrderAuditLog.IRequest>(),
    },
  );
  typia.assert(output);
}
