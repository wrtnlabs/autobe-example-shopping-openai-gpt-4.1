import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ISnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ISnapshot";

export async function test_api_snapshots_putById(connection: api.IConnection) {
  const output: ISnapshot = await api.functional.snapshots.putById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
    body: typia.random<ISnapshot.IUpdate>(),
  });
  typia.assert(output);
}
