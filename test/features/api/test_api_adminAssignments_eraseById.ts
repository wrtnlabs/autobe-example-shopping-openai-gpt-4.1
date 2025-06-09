import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAdminAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdminAssignment";

export async function test_api_adminAssignments_eraseById(
  connection: api.IConnection,
) {
  const output: IAdminAssignment =
    await api.functional.adminAssignments.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
