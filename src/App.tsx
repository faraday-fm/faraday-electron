import { FarMore, FarMoreHost, createInMemoryFs } from "@far-more/web-ui";
import { buildFarMoreFs } from "./services/fs";

console.log("***");

const farMoreFs = createInMemoryFs();
buildFarMoreFs(farMoreFs);

const host: FarMoreHost = {
  config: {
    isDesktop: () => false,
  },
  farMoreFs,
  rootFs: (window as any).api.fs,
};

function App() {
  return <FarMore host={host} />;
}

export default App;
