import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageISellerChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageISellerChannelAssignment";
import { ISellerChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ISellerChannelAssignment";

export async function test_api_sellerChannelAssignments_patch(
  connection: api.IConnection,
) {
  const output: IPageISellerChannelAssignment =
    await api.functional.sellerChannelAssignments.patch(connection, {
      body: typia.random<ISellerChannelAssignment.IRequest>(),
    });
  typia.assert(output);
}
