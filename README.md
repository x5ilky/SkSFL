# SkSFL

SkSFL is a collection of modules and tools containing various utilities for
writing typescript code.

> SkSFL stands for **S**il**k**y **S**ingle **F**ile **L**ibraries.

- [SkSFL](#sksfl)
  - [Amalgamate](#amalgamate)
  - [Modules](#modules)
  - [Tools](#tools)

## Amalgamate

**StAm** is a tool that amalgamates the multiple modules into a single file that
you can paste into your project.

To download the tool, run `git clone https://github.com/x5ilky/SkSFL`, and use the below command in the root directory of the repository.

Usage:

```sh
# run SkAm with deno
deno run -A ./build/SkAm.ts build -m <modules> -r <runtime> -o <output file>
```

- `runtime` is either `deno` or `node`.
- `modules` is a space separated list of modules to amalgamate.
- `output file` is the path to the output file.

## Modules

| Module | Full Name                            | Description                                   |
| ------ | ------------------------------------ | --------------------------------------------- |
| `SkDc` | **S**il**k** **D**is**c**ord         | Discord bot library                           |
| `SkLg` | **S**il**k** **L**o**g**ger          | Fancy colored logger                          |
| `SkOp` | **S**il**k** **Op**tion              | Simple option type implementation             |
| `SkRd` | **S**il**k** **R**an**d**om          | Short `Math.random` wrapper                   |
| `SkAn` | **S**il**k** **An**si                | Ansi color code wrapper                       |
| `SkLt` | **S**il**k** **L**oot **T**able      | Loot table (weighted random) implementation   |
| `SkCh` | **S**il**k** **Ch**aining            | Value chaining                                |
| `SkAp` | **S**il**k** **A**rgument **P**arser | Type safe shaped command line argument parser |
| `SkSa` | **S**il**k** **S**tring **A**lign    | Align strings for printing                    |

## Tools

| Tool   | Full Name                           | Description                  |
| ------ | ----------------------------------- | ---------------------------- |
| `StAm` | **S**ilk **T**ool **Am**algamate         | Amalgamates modules together |
| `StTg` | **S**ilk **T**ool **T**ype **G**enerator | Generates types              |
