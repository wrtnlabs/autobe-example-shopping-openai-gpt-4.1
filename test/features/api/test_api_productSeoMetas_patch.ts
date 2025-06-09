import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIProductSeoMeta } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIProductSeoMeta";
import { IProductSeoMeta } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductSeoMeta";

export async function test_api_productSeoMetas_patch(
  connection: api.IConnection,
) {
  const output: IPageIProductSeoMeta =
    await api.functional.productSeoMetas.patch(connection, {
      body: typia.random<IProductSeoMeta.IRequest>(),
    });
  typia.assert(output);
}
