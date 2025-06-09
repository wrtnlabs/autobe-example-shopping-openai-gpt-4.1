import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuditLog";

export async function test_api_auditLogs_getById(connection: api.IConnection) {
  const output: IAuditLog = await api.functional.auditLogs.getById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
}
