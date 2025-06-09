import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuditLog";

export async function test_api_auditLogs_eraseById(
  connection: api.IConnection,
) {
  const output: IAuditLog.ISoftDeleteResult =
    await api.functional.auditLogs.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
