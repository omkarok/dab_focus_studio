// Placeholder for customization and extensibility hooks.
// TODO: support custom column names, themes, and plugins.

export type Plugin = {
  name: string;
  setup: () => void;
};

const plugins: Plugin[] = [];

export function registerPlugin(p: Plugin) {
  plugins.push(p);
  p.setup();
}

export function listPlugins(): string[] {
  return plugins.map((p) => p.name);
}
