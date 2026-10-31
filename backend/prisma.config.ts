export interface PrismaConfig {
  skills?: {
    agents?: string[];
  };
  [key: string]: unknown;
}

export function definePrismaConfig(config: PrismaConfig): PrismaConfig {
  return config;
}

export default definePrismaConfig({
  skills: {
    agents: ["claude", "cursor", "agents", "devin"],
  },
});
