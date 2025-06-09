import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRbacAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRbacAssignment";
import { IRbacAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRbacAssignment";

export async function test_api_rbacAssignments_patch(
  connection: api.IConnection,
) {
  const output: IPageIRbacAssignment =
    await api.functional.rbacAssignments.patch(connection, {
      body: typia.random<IRbacAssignment.IRequestSearch>(),
    });
  typia.assert(output);
}
