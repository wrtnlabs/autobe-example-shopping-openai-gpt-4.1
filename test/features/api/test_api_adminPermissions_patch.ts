import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAdminPermission";
import { IAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdminPermission";

export async function test_api_adminPermissions_patch(
  connection: api.IConnection,
) {
  const output: IPageIAdminPermission =
    await api.functional.adminPermissions.patch(connection, {
      body: typia.random<IAdminPermission.IRequest>(),
    });
  typia.assert(output);
}
