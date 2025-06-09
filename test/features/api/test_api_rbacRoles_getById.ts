import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRbacRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRbacRole";

export async function test_api_rbacRoles_getById(connection: api.IConnection) {
  const output: IRbacRole = await api.functional.rbacRoles.getById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
}
