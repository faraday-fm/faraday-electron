import { FarMore, FarMoreHost, createInMemoryFs } from "@far-more/web-ui";
import { buildFarMoreFs } from "./services/fs";
import { localFs } from "./services/localFs";

const farMoreFs = createInMemoryFs();
buildFarMoreFs(farMoreFs);

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
