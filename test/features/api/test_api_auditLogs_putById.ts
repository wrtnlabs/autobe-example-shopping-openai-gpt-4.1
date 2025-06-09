import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuditLog";

export async function test_api_auditLogs_putById(connection: api.IConnection) {
  const output: IAuditLog = await api.functional.auditLogs.putById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
    body: typia.random<IAuditLog.IUpdate>(),
  });
  typia.assert(output);
}
