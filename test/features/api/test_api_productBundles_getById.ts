import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductBundle";

export async function test_api_productBundles_getById(
  connection: api.IConnection,
) {
  const output: IProductBundle = await api.functional.productBundles.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
