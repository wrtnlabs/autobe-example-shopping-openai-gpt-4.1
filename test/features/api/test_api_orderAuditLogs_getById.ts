import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IOrderAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrderAuditLog";

export async function test_api_orderAuditLogs_getById(
  connection: api.IConnection,
) {
  const output: IOrderAuditLog = await api.functional.orderAuditLogs.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
