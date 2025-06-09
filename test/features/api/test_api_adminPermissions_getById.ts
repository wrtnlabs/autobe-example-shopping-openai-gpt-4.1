import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdminPermission";

export async function test_api_adminPermissions_getById(
  connection: api.IConnection,
) {
  const output: IAdminPermission =
    await api.functional.adminPermissions.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
