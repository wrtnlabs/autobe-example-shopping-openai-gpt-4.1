import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrderSnapshot";

export async function test_api_orderSnapshots_post(
  connection: api.IConnection,
) {
  const output: IOrderSnapshot = await api.functional.orderSnapshots.post(
    connection,
    {
      body: typia.random<IOrderSnapshot.ICreate>(),
    },
  );
  typia.assert(output);
}
