import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRbacRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRbacRole";

export async function test_api_rbacRoles_post(connection: api.IConnection) {
  const output: IRbacRole = await api.functional.rbacRoles.post(connection, {
    body: typia.random<IRbacRole.ICreate>(),
  });
  typia.assert(output);
}
