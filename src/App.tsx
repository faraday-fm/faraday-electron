import { FarMore, FarMoreHost } from "@far-more/web-ui";
import { localFs } from "./services/localFs";

// const farMoreFs = buildFarMoreFs();

const host: FarMoreHost = {
  config: {
    isDesktop: () => false,
  },
  farMoreFs: localFs(
    "/Users/mike/github/far-more/far-more-electron/src/assets"
  ),
  rootFs: localFs(""),
};

function App() {
  return <FarMore host={host} />;
}

export default App;
