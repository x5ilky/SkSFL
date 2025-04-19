import { SkSerializer } from "../shared/SkSr.ts"
const f = Deno.args[0];
const deser = new SkSerializer()
const v = deser.deserialize(new TextEncoder().encode(Deno.readTextFileSync(f)));

console.dir(v, { depth: null })