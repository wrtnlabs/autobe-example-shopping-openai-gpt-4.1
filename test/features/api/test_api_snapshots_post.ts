import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ISnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ISnapshot";

export async function test_api_snapshots_post(connection: api.IConnection) {
  const output: ISnapshot = await api.functional.snapshots.post(connection, {
    body: typia.random<ISnapshot.ICreate>(),
  });
  typia.assert(output);
}
