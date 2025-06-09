import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IProduct";

export async function test_api_products_getById(connection: api.IConnection) {
  const output: IProduct = await api.functional.products.getById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
}
