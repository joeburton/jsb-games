import { useEffect, useState } from "react";

/** Parsed view for the current URL hash. */
export type Route =
  | { name: "home" }
  | { name: "game"; id: string }
  | { name: "not-found"; id: string };

const parse = (hash: string): Route => {
  const path = hash.replace(/^#\/?/, "").replace(/\/$/, "");
  if (path === "" || path === "home") return { name: "home" };
  const match = /^game\/([\w-]+)$/.exec(path);
  if (match) return { name: "game", id: match[1] };
  return { name: "not-found", id: path };
};

export const useHashRoute = (): Route => {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));

  useEffect(() => {
    const onChange = () => {
      setRoute(parse(window.location.hash));
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
};

export const hrefFor = (route: Route): string => {
  if (route.name === "game") return `#/game/${route.id}`;
  return "#/";
};
