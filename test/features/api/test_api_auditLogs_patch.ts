import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAuditLog";
import { IAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuditLog";

export async function test_api_auditLogs_patch(connection: api.IConnection) {
  const output: IPageIAuditLog = await api.functional.auditLogs.patch(
    connection,
    {
      body: typia.random<IAuditLog.IRequestSearch>(),
    },
  );
  typia.assert(output);
}
