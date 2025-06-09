import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRbacRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRbacRole";
import { IRbacRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRbacRole";

export async function test_api_rbacRoles_patch(connection: api.IConnection) {
  const output: IPageIRbacRole = await api.functional.rbacRoles.patch(
    connection,
    {
      body: typia.random<IRbacRole.IRequest>(),
    },
  );
  typia.assert(output);
}
