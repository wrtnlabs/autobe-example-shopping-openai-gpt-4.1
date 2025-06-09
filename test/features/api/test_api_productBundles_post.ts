import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductBundle";

export async function test_api_productBundles_post(
  connection: api.IConnection,
) {
  const output: IProductBundle = await api.functional.productBundles.post(
    connection,
    {
      body: typia.random<IProductBundle.ICreate>(),
    },
  );
  typia.assert(output);
}
