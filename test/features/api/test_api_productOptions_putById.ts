import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductOption";

export async function test_api_productOptions_putById(
  connection: api.IConnection,
) {
  const output: IProductOption = await api.functional.productOptions.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IProductOption.IUpdate>(),
    },
  );
  typia.assert(output);
}
