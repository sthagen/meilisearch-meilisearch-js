import { MeiliSearch } from '../../../../dist/esm/index.js'
import { generateTenantToken } from '../../../../dist/esm/token.js'

const client = new MeiliSearch({ host:'http://localhost:7700', apiKey: 'masterKey' })
const defaultClient = new DefaultMeiliSearch.MeiliSearch({ host:'http://localhost:7700', apiKey: 'masterKey' })
generateTenantToken({ apiKey: 'masterKey', apiKeyUid:'e489fe16-3381-431b-bee3-00430192915d' })
  .then((token) => console.log({ client, token, defaultClient }))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
