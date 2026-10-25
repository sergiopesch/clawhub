import { createRouter } from "@tanstack/react-router";
import { getGlobalStartContext } from "@tanstack/react-start";
// Import the generated route tree
import { routeTree } from "./routeTree.gen";

// Create a new router instance
export const getRouter = () => {
  const requestContext = (import.meta.env.SSR ? getGlobalStartContext() : undefined) as
    | { nonce?: unknown }
    | undefined;
  const nonce = typeof requestContext?.nonce === "string" ? requestContext.nonce : undefined;
  const router = createRouter({
    routeTree,
    context: {},
    // Start captures bootstrap scripts before the render callback runs.
    ssr: { nonce },

    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
