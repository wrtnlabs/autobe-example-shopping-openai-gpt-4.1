import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdminRole";

export async function test_api_adminRoles_post(connection: api.IConnection) {
  const output: IAdminRole = await api.functional.adminRoles.post(connection, {
    body: typia.random<IAdminRole.ICreate>(),
  });
  typia.assert(output);
}
