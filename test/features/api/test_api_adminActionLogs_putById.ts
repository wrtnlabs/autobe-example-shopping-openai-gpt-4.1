import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdminActionLog";

export async function test_api_adminActionLogs_putById(
  connection: api.IConnection,
) {
  const output: IAdminActionLog = await api.functional.adminActionLogs.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IAdminActionLog.IUpdate>(),
    },
  );
  typia.assert(output);
}
