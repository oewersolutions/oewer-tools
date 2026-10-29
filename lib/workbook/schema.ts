import schemaJson from "../../schemas/workbook_schema.json";
import type { Schema } from "./types";

export const schema = schemaJson as unknown as Schema;
