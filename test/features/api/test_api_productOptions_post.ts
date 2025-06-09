import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductOption";

export async function test_api_productOptions_post(
  connection: api.IConnection,
) {
  const output: IProductOption = await api.functional.productOptions.post(
    connection,
    {
      body: typia.random<IProductOption.ICreate>(),
    },
  );
  typia.assert(output);
}
