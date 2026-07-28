const baseUrl = process.env.PORTRAIT_LOCAL_URL || "http://localhost:3000";

const response = await fetch(`${baseUrl}/api/portrait/state`);
if (!response.ok) {
  throw new Error(
    `Seed failed at ${baseUrl}. Start the dev server first or set PORTRAIT_LOCAL_URL.`,
  );
}
const state = await response.json();
console.log(
  `CATV Portrait seed ready: ${state.styles.length} styles, ${state.modules.length} prompt modules, ${state.orders.length} example order(s).`,
);

