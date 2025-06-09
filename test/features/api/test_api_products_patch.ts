import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIProduct";

export async function test_api_products_patch(connection: api.IConnection) {
  const output: IPageIProduct = await api.functional.products.patch(connection);
  typia.assert(output);
}
