import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ISellerChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ISellerChannelAssignment";

export async function test_api_sellerChannelAssignments_putById(
  connection: api.IConnection,
) {
  const output: ISellerChannelAssignment =
    await api.functional.sellerChannelAssignments.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ISellerChannelAssignment.IUpdate>(),
    });
  typia.assert(output);
}
