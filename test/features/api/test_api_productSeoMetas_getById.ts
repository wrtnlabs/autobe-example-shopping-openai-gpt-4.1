import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IProductSeoMeta } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductSeoMeta";

export async function test_api_productSeoMetas_getById(
  connection: api.IConnection,
) {
  const output: IProductSeoMeta = await api.functional.productSeoMetas.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
