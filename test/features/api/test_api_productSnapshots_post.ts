import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductSnapshot";

export async function test_api_productSnapshots_post(
  connection: api.IConnection,
) {
  const output: IProductSnapshot = await api.functional.productSnapshots.post(
    connection,
    {
      body: typia.random<IProductSnapshot.ICreate>(),
    },
  );
  typia.assert(output);
}
