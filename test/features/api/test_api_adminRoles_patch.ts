import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAdminRole";
import { IAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdminRole";

export async function test_api_adminRoles_patch(connection: api.IConnection) {
  const output: IPageIAdminRole = await api.functional.adminRoles.patch(
    connection,
    {
      body: typia.random<IAdminRole.IRequest>(),
    },
  );
  typia.assert(output);
}
