import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAdminAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdminAssignment";

export async function test_api_adminAssignments_post(
  connection: api.IConnection,
) {
  const output: IAdminAssignment = await api.functional.adminAssignments.post(
    connection,
    {
      body: typia.random<IAdminAssignment.ICreate>(),
    },
  );
  typia.assert(output);
}
