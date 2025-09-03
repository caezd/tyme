import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import css from "rollup-plugin-css-only";
import { terser } from "rollup-plugin-terser";

export default [
    {
        input: "src/index.js",
        output: [
            {
                file: "dist/plugin_name.esm.js",
                format: "esm",
                sourcemap: true,
            },
            {
                file: "dist/plugin_name.js",
                format: "iife",
                name: "PluginName",
                sourcemap: true,
            },
        ],
        plugins: [
            resolve(),
            commonjs(),
            css({ output: "bundle.css" }) /*terser()*/,
        ],
    },
];
