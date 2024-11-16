# sol
Shadcn one-liner

## Install

First you must have [bun](https://bun.sh/). Then you can directly download `sol.js`:

```shell
wget https://github.com/asiffer/sol/actions/runs/11870669271/artifacts/2196625716
```

## Run

Run `sol` with the shadcn color theme you want (currently it assumes the New-York theme).

```shell
sol.js -t slate index.html 
```

## Why?

Tailwind, Shadcn... and all the front garbage are always a mess to install and setup. I basically need a CLI tool that applies
shadcn styles on my input html file (NO git clone template of the death, NO npm xxx, NO interactive npx do-all@latest, NO other front boilerplate).

They are probably better ways to do what I wanted but this one works. I am also likely to bundle `bun` to provide a single bloated executable (roughly 100MB).
