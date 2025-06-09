import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ISnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ISnapshot";

export async function test_api_snapshots_getById(connection: api.IConnection) {
  const output: ISnapshot = await api.functional.snapshots.getById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
}
