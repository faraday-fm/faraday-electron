import { Faraday, FaradayHost } from '@frdy/web-ui'
import { LocalFsApi } from '../../shared/types'
import { localFs } from './services/localFs'

const localFsApi = (window as any).localFsApi as LocalFsApi

const homedir = await localFsApi.homedir()

const host: FaradayHost = {
  config: {
    isDesktop: () => false
  },
  faradayFs: localFs(homedir + '/.faraday'),
  rootFs: localFs('')
}

function App(): JSX.Element {
  return <Faraday host={host} />
}

export default App
