import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdminRole";

export async function test_api_adminRoles_putById(connection: api.IConnection) {
  const output: IAdminRole = await api.functional.adminRoles.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IAdminRole.IUpdate>(),
    },
  );
  typia.assert(output);
}
