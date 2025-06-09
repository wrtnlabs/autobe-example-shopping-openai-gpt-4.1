import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IEmpty } from "@ORGANIZATION/PROJECT-api/lib/structures/IEmpty";

export async function test_api_boardConfigs_eraseById(
  connection: api.IConnection,
) {
  const output: IEmpty = await api.functional.boardConfigs.eraseById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
