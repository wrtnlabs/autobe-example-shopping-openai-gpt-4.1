import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdminActionLog";

export async function test_api_adminActionLogs_getById(
  connection: api.IConnection,
) {
  const output: IAdminActionLog = await api.functional.adminActionLogs.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
