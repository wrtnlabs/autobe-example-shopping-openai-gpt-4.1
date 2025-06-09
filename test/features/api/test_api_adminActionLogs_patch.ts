import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAdminActionLog";

export async function test_api_adminActionLogs_patch(
  connection: api.IConnection,
) {
  const output: IPageIAdminActionLog =
    await api.functional.adminActionLogs.patch(connection);
  typia.assert(output);
}
