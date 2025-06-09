import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageISnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageISnapshot";
import { ISnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ISnapshot";

export async function test_api_snapshots_patch(connection: api.IConnection) {
  const output: IPageISnapshot = await api.functional.snapshots.patch(
    connection,
    {
      body: typia.random<ISnapshot.IRequest>(),
    },
  );
  typia.assert(output);
}
