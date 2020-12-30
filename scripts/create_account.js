const fs = require('fs')
const path = require('path')
const readline = require('readline')
const { Writable } = require('stream')
const {
  recoverKeystore,
  generateKeystore,
} = require('ethereum-keystore')
const Web3 = require('web3')
const crypto = require('crypto')
const {
  generateMnemonic,
  mnemonicToEntropy,
  wordlists,
} = require('bip39')
const chalk = require('chalk')

const KEYSTORE_PASSWORD = 'password'
const ACCOUNT_NUMBER = 1

;(async () => {
  try {
    const { websocket } = await generateCoordinatorEnv()
    await generateWallet(websocket)
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

/**
  mnemonic wallet generation
**/
async function generateWallet(websocket) {
  const emptyConfigPath = path.join(process.cwd(), 'wallet.goerli.empty.json')
  const configPath = path.join(process.cwd(), 'wallet.goerli.json')
  try {
    const _data = fs.readFileSync(configPath)
    const data = JSON.parse(_data)
    if (data.seedKeystore && data.password && data.websocket) {
      console.log('Wallet detected, skipping configuration')
      return
    }
  } catch (__) {}
  const _emptyData = fs.readFileSync(emptyConfigPath)
  const emptyData = JSON.parse(_emptyData)
  const mnemonic = createMnemonic()
  const wallet = exportWallet(mnemonic, KEYSTORE_PASSWORD)
  const final = JSON.stringify({
    seedKeystore: wallet,
    password: KEYSTORE_PASSWORD,
    accountNumber: ACCOUNT_NUMBER,
    ...emptyData,
    websocket,
  }, null, 2)
  fs.writeFileSync(configPath, final)
}

function createMnemonic(strength = 256, list = wordlists['english']) {
  return generateMnemonic(strength, undefined, list)
}

function exportWallet(mnemonic, password) {
  const entropy = mnemonicToEntropy(mnemonic)
  const algorithm = 'aes-256-cbc'
  const salt = crypto.randomBytes(32)
  const iv = crypto.randomBytes(16)
  const kdf = 'scrypt'
  const keylen = 32
  const kdfParams = {
    N: 16384, // cost
    r: 8, // block size
    p: 1, // parallelization
  }
  const key = crypto.scryptSync(password, salt, keylen, kdfParams)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  const ciphertext =
    cipher.update(entropy, 'binary', 'hex') + cipher.final('hex')
  const hdwallet = {
    ciphertext,
    iv: iv.toString('hex'),
    algorithm,
    keylen,
    kdf,
    N: kdfParams.N,
    r: kdfParams.r,
    p: kdfParams.p,
    salt: salt.toString('hex'),
  }
  return hdwallet
}

/**
  Regular wallet generation
**/
async function generateCoordinatorEnv() {
  const emptyConfigPath = path.join(process.cwd(), 'coordinator.goerli.empty.json')
  const configPath = path.join(process.cwd(), 'coordinator.goerli.json')
  try {
    const _data = fs.readFileSync(configPath)
    const data = JSON.parse(_data)
    if (data.keystore && data.password && data.websocket) {
      // already configured
      console.log('Coordinator account detected, skipping configuration')
      return data
    }
  } catch (__) {}
  const _emptyData = fs.readFileSync(emptyConfigPath)
  const emptyData = JSON.parse(_emptyData)
  let websocket, err
  do {
    websocket = await readInput('Görli node websocket url: ')
    err = await getChainId(websocket)
    if (err) console.log(err)
  } while (err)
  // const password = await readPassword('Enter wallet password: ')

  const keystore = await generateKeystore(null, KEYSTORE_PASSWORD)
  console.log('')
  console.log(`Send Ether to ${chalk.blue.underline(`0x${keystore.address}`)}`)
  console.log(`Only send ${chalk.blue('Görli')} testnet Ether, this wallet is not secure`)
  console.log('Waiting for deposit...')
  await new Promise((rs, rj) => {
    const web3 = new Web3(new Web3.providers.WebsocketProvider(websocket))
    const timer = setInterval(async () => {
      const balance = await web3.eth.getBalance(keystore.address)
      if (balance.toString() !== '0') {
        clearInterval(timer)
        console.log(`${web3.utils.fromWei(balance)} Eth transaction detected, continuing`)
        await new Promise(r => setTimeout(r, 1500))
        rs()
      }
    }, 1000)
    web3.eth.subscribe('pendingTransactions', async (err, txhash) => {
      if (err) {
        clearInterval(timer)
        rj(err)
        return
      }
      const { from, to, value, gas } = (await web3.eth.getTransaction(txhash)) || {}
      if (normalizeAddr(to) === normalizeAddr(keystore.address)) {
        console.log(`${web3.utils.fromWei(value)} Eth transaction detected, continuing`)
        clearInterval(timer)
        await new Promise(r => setTimeout(r, 1500))
        rs()
      }
    })
  })
  const finalData = {
    ...emptyData,
    websocket,
    keystore,
    password: KEYSTORE_PASSWORD,
  }
  const final = JSON.stringify(finalData, null, 2)
  fs.writeFileSync(configPath, final)
  return finalData
}

function normalizeAddr(addr = '') {
  if (!addr) return ''
  return addr.toLowerCase().replace('0x', '')
}

async function getChainId(wsUrl) {
  try {
    const web3 = new Web3(new Web3.providers.WebsocketProvider(wsUrl))
    const chainId = await web3.eth.getChainId()
    if (+chainId !== 5) {
      return 'Incorrect chain id, enter a Görli node url'
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
