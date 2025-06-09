import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRbacAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRbacAssignment";

export async function test_api_rbacAssignments_eraseById(
  connection: api.IConnection,
) {
  const output: IRbacAssignment =
    await api.functional.rbacAssignments.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
