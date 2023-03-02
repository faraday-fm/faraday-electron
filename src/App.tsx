import { FarMore, FarMoreHost } from "@far-more/web-ui";
import { buildFarMoreFs } from "./services/fs";
import { localFs } from "./services/localFs";

const farMoreFs = buildFarMoreFs();

const host: FarMoreHost = {
  config: {
    isDesktop: () => false,
  },
  farMoreFs,
  rootFs: localFs,
};

function App() {
  return <FarMore host={host} />;
}

export default App;
