import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ISellerChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ISellerChannelAssignment";

export async function test_api_sellerChannelAssignments_post(
  connection: api.IConnection,
) {
  const output: ISellerChannelAssignment =
    await api.functional.sellerChannelAssignments.post(connection, {
      body: typia.random<ISellerChannelAssignment.ICreate>(),
    });
  typia.assert(output);
}
