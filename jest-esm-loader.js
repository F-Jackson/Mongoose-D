import { transform } from "esbuild";

export async function process(source, filename) {
  const result = await transform(source, { loader: "js", target: "es2020", format: "esm" });
  return result.code;
}
