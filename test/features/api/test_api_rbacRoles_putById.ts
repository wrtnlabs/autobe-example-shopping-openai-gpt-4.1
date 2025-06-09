import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRbacRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRbacRole";

export async function test_api_rbacRoles_putById(connection: api.IConnection) {
  const output: IRbacRole = await api.functional.rbacRoles.putById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
    body: typia.random<IRbacRole.IUpdate>(),
  });
  typia.assert(output);
}
