import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdminRole";

export async function test_api_adminRoles_eraseById(
  connection: api.IConnection,
) {
  const output: IAdminRole = await api.functional.adminRoles.eraseById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
