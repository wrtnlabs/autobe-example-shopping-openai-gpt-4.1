import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRbacAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRbacAssignment";

export async function test_api_rbacAssignments_post(
  connection: api.IConnection,
) {
  const output: IRbacAssignment = await api.functional.rbacAssignments.post(
    connection,
    {
      body: typia.random<IRbacAssignment.ICreate>(),
    },
  );
  typia.assert(output);
}
