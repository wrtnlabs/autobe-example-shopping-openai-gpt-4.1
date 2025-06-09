import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRbacPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IRbacPermission";

export async function test_api_rbacPermissions_getById(
  connection: api.IConnection,
) {
  const output: IRbacPermission = await api.functional.rbacPermissions.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
