import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductBundle";

export async function test_api_productBundles_putById(
  connection: api.IConnection,
) {
  const output: IProductBundle = await api.functional.productBundles.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IProductBundle.IUpdate>(),
    },
  );
  typia.assert(output);
}
