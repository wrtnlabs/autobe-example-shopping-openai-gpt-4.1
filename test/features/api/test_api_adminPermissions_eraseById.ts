import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdminPermission";

export async function test_api_adminPermissions_eraseById(
  connection: api.IConnection,
) {
  const output: IAdminPermission =
    await api.functional.adminPermissions.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
