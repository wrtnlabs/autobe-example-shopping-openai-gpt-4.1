import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIProductBundle";
import { IProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductBundle";

export async function test_api_productBundles_patch(
  connection: api.IConnection,
) {
  const output: IPageIProductBundle = await api.functional.productBundles.patch(
    connection,
    {
      body: typia.random<IProductBundle.IRequest>(),
    },
  );
  typia.assert(output);
}
