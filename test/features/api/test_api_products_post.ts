import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IProduct";

export async function test_api_products_post(connection: api.IConnection) {
  const output: IProduct = await api.functional.products.post(connection, {
    body: typia.random<IProduct.ICreate>(),
  });
  typia.assert(output);
}
