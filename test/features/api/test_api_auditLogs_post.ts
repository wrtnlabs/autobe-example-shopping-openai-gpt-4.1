import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuditLog";

export async function test_api_auditLogs_post(connection: api.IConnection) {
  const output: IAuditLog = await api.functional.auditLogs.post(connection, {
    body: typia.random<IAuditLog.ICreate>(),
  });
  typia.assert(output);
}
