import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IProductSeoMeta } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductSeoMeta";

export async function test_api_productSeoMetas_post(
  connection: api.IConnection,
) {
  const output: IProductSeoMeta = await api.functional.productSeoMetas.post(
    connection,
    {
      body: typia.random<IProductSeoMeta.ICreate>(),
    },
  );
  typia.assert(output);
}
