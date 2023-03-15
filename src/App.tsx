import { Faraday, FaradayHost } from "@frdy/web-ui";
import { localFs } from "./services/localFs";

// const faradayFs = buildFaradayFs();

const host: FaradayHost = {
  config: {
    isDesktop: () => false,
  },
  faradayFs: localFs(
    "/Users/mike/github/faraday-fm/faraday-electron/src/assets"
  ),
  rootFs: localFs(""),
};

function App() {
  return <Faraday host={host} />;
}

export default App;
