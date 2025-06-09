import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAdminAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdminAssignment";

export async function test_api_adminAssignments_putById(
  connection: api.IConnection,
) {
  const output: IAdminAssignment =
    await api.functional.adminAssignments.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IAdminAssignment.IUpdate>(),
    });
  typia.assert(output);
}
