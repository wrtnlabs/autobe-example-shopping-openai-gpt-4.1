import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdminActionLog";

export async function test_api_adminActionLogs_post(
  connection: api.IConnection,
) {
  const output: IAdminActionLog = await api.functional.adminActionLogs.post(
    connection,
    {
      body: typia.random<IAdminActionLog.ICreate>(),
    },
  );
  typia.assert(output);
}
