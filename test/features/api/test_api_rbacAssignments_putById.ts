import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRbacAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRbacAssignment";

export async function test_api_rbacAssignments_putById(
  connection: api.IConnection,
) {
  const output: IRbacAssignment = await api.functional.rbacAssignments.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IRbacAssignment.IUpdate>(),
    },
  );
  typia.assert(output);
}
