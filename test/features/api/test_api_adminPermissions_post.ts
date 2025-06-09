import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdminPermission";

export async function test_api_adminPermissions_post(
  connection: api.IConnection,
) {
  const output: IAdminPermission = await api.functional.adminPermissions.post(
    connection,
    {
      body: typia.random<IAdminPermission.ICreate>(),
    },
  );
  typia.assert(output);
}
