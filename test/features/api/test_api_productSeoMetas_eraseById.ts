import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IProductSeoMetas } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductSeoMetas";

export async function test_api_productSeoMetas_eraseById(
  connection: api.IConnection,
) {
  const output: IProductSeoMetas =
    await api.functional.productSeoMetas.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
