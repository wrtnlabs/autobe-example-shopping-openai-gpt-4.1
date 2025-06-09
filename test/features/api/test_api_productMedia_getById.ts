import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IProductMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductMedia";

export async function test_api_productMedia_getById(
  connection: api.IConnection,
) {
  const output: IProductMedia = await api.functional.productMedia.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
