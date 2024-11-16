import { version } from "./package.json";
import postcss from "postcss";
import tailwind, { type Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";
import { parseHTML } from "linkedom";
import { Command } from "commander";
import { watch } from "fs";
import { randomUUIDv7, type ServerWebSocket } from "bun";
// @ts-ignore
import gray from "./css/gray.txt" with { type: "text" }; 
// @ts-ignore
import neutral from "./css/neutral.txt" with { type: "text" }; 
// @ts-ignore
import slate from "./css/slate.txt" with { type: "text" }; 
// @ts-ignore
import stone from "./css/stone.txt" with { type: "text" }; 
// @ts-ignore
import zinc from "./css/zinc.txt" with { type: "text" }; 

const VERSION = version;

const CSS = {
  "gray": gray,
  "neutral": neutral,
  "slate": slate,
  "stone":stone,
  "zinc": zinc
} as const;

type Theme = keyof typeof CSS;

const config: Config = {
  darkMode: ["class"],
  content: [
    {
      raw: "",
      extension: "html",
    },
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1536px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
        mono: ["var(--font-mono)", ...fontFamily.mono],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

const buildConfig = (raw: string): Config => {
  return {
    ...config,
    content: [
      {
        raw: raw,
        extension: "html",
      },
    ],
  };
};



const buildCSS = async (rawHTML: string, theme: Theme = "slate") => {
  const plugin = tailwind(buildConfig(rawHTML));
  const css = CSS[theme];
  // add inter font
  const inputCSS = `@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
  ${css}
  :root {
    --font-sans: "Inter";
  }`;
  const result = await postcss([plugin]).process(inputCSS, { from: undefined });
  return result.css;
};

const debug = (msg: string) => {
  console.log(`\x1b[2m${msg}\x1b[0m`);
};

interface Options {
  hostname: string;
  port: string;
  theme: Theme;
}

interface WebsocketData {
  id: string;
}

const action = async (htmlFile: string, options: Options) => {
  console.log(`🤩 sol - shadcn one-liner - (version ${VERSION})`);
  const clients = new Set<ServerWebSocket<WebsocketData>>();
  // Watch for file changes and notify all connected clients
  watch(htmlFile, { recursive: false }, () => {
    console.log("🔥 File change detected, reloading clients...");
    for (const client of clients) {
      client.send("reload"); // Send a reload message to each client
    }
  });

  const js = `
const ws = new WebSocket("ws://" + location.host);

ws.onmessage = (event) => {
  if (event.data === "reload") {
    location.reload();
  }
};
  `;

  const file = Bun.file(htmlFile);
  console.log(`🕵️  Watching ${htmlFile}`);
  console.log(`🚀 Listening at http://${options.hostname}:${options.port}`);

  // serve
  Bun.serve({
    hostname: options.hostname,
    port: +options.port,
    async fetch(req, server) {
      // websocket
      server.upgrade(req);

      try {
        const html = await file.text();
        const css = await buildCSS(html);
        const { document } = parseHTML(html);
        const style = document.createElement("style");
        style.innerHTML = css;

        const script = document.createElement("script");
        script.innerHTML = js;
        document.head.append(style, script);

        return new Response(document.documentElement.outerHTML, {
          headers: {
            "Content-Type": "text/html", // Set the appropriate MIME type based on the file
          },
        });
      } catch (error) {
        return new Response(`File "${htmlFile}" not found`, { status: 404 });
      }
    },
    websocket: {
      // Called when a WebSocket connection is opened
      open(ws: ServerWebSocket<WebsocketData>) {
        ws.data = { id: randomUUIDv7() };
        clients.add(ws); // Add new client to the set
        debug(
          `🔌 WebSocket connection opened at ${ws.remoteAddress} [${ws.data.id}]`
        );
      },

      // Called when a message is received (not needed for live reload)
      message(ws, message) {},

      // Called when a WebSocket connection is closed
      close(ws: ServerWebSocket<WebsocketData>, code, message) {
        clients.delete(ws); // Remove the client from the set
        debug(`👋 WebSocket connection closed [${ws.data.id}]`);
      },
    },
  });
};

const program = new Command();
program
  .argument("[htmlFile]", "input html file", "index.html")
  .option("-p, --port <port>", "listening port", "3000")
  .option("-h, --hostname <hostname>", "hostname", "127.0.0.1")
  .option("-t, --theme <theme>", "shadcn theme", "slate")
  .action(action);

program.parse();
