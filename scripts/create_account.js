const fs = require('fs')
const path = require('path')
const readline = require('readline')
const { Writable } = require('stream')
const {
  recoverKeystore,
  generateKeystore,
} = require('ethereum-keystore')
const Web3 = require('web3')

;(async () => {
  try {
    await generateEnv()
    process.exit(0)
  } catch (err) {
    console.log(err)
    console.log('Uncaught error')
    process.exit(1)
  }
})()

function terminate() {
  console.log('\n\nAborting...\n')
  process.exit(1)
}
process.on('SIGINT', terminate)
process.on('SIGTERM', terminate)

async function generateEnv() {
  const emptyConfigPath = path.join(process.cwd(), 'coordinator.kovan.empty.json')
  const configPath = path.join(process.cwd(), 'coordinator.kovan.json')
  try {
    const _data = fs.readFileSync(configPath)
    const data = JSON.parse(_data)
    if (data.keystore && data.password && data.websocket) {
      // already configured
      console.log('Coordinator account detected, skipping configuration')
      return
    }
  } catch (__) {}
  const _emptyData = fs.readFileSync(emptyConfigPath)
  const emptyData = JSON.parse(_emptyData)
  let websocket, err
  do {
    websocket = await readInput('Kovan node websocket url: ')
    err = await getChainId(websocket)
    if (err) console.log(err)
  } while (err)
  const password = await readPassword('Enter wallet password: ')

  const keystore = await generateKeystore(null, password)
  const final = JSON.stringify({
    ...emptyData,
    websocket,
    keystore,
    password,
  }, null, 2)
  fs.writeFileSync(configPath, final)
  console.log('')
  console.log(`Send Ether to 0x${keystore.address}`)
  console.log('Only send Kovan testnet Ether, this wallet is not secure')
  console.log('Waiting for testnet deposit')
  await new Promise((rs, rj) => {
    const web3 = new Web3(new Web3.providers.WebsocketProvider(websocket))
    web3.eth.subscribe('pendingTransactions', async (err, txhash) => {
      if (err) {
        rj(err)
        return
      }
      const { from, to, value, gas } = (await web3.eth.getTransaction(txhash)) || {}
      if (normalizeAddr(to) === normalizeAddr(keystore.address)) {
        console.log(`${web3.utils.fromWei(value)} Eth transaction detected, continuing`)
        await new Promise(r => setTimeout(r, 1500))
        rs()
      }
    })
  })
}

function normalizeAddr(addr = '') {
  if (!addr) return ''
  return addr.toLowerCase().replace('0x', '')
}

async function getChainId(wsUrl) {
  try {
    const web3 = new Web3(new Web3.providers.WebsocketProvider(wsUrl))
    const chainId = await web3.eth.getChainId()
    if (+chainId !== 42) {
      return 'Incorrect chain id, enter a Kovan node url'
    }
  } catch (err) {
    console.log(err)
    return 'Error connecting to node, try again'
  }
}

async function readPassword(prompt = 'Password: ') {
  let muted = false
  const mutableStdout = new Writable({
    write: function(chunk, encoding, callback) {
      if (!muted)
        process.stdout.write(chunk, encoding)
      callback()
    }
  })
  const rl = readline.createInterface({
    input: process.stdin,
    output: mutableStdout,
    terminal: true,
  })
  rl.on('SIGINT', terminate)
  rl.on('SIGTERM', terminate)
  const promise = new Promise(rs => {
    rl.question(prompt, (password) => {
      rs(password.trim())
      rl.close()
    })
  })
  muted = true
  return await promise
}

async function readInput(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  })
  rl.on('SIGINT', terminate)
  rl.on('SIGTERM', terminate)
  return await new Promise(rs => {
    rl.question(prompt, (input) => {
      rs(input.trim())
      rl.close()
    })
  })
}
