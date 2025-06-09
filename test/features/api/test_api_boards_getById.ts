import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IBoard";

export async function test_api_boards_getById(connection: api.IConnection) {
  const output: IBoard = await api.functional.boards.getById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
}
