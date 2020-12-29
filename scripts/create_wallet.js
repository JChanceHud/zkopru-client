const crypto = require('crypto')
const {
  generateMnemonic,
  mnemonicToEntropy,
  wordlists,
} = require('bip39')
const path = require('path')
const fs = require('fs')

const KEYSTORE_PASSWORD = 'password'
const ACCOUNT_NUMBER = 1

;(async () => {
  try {
    await generateWallet()
  } catch (err) {
    console.log(err)
    console.log(`Uncaught error`)
    process.exit(1)
  }
})()

async function generateWallet() {
  const emptyConfigPath = path.join(process.cwd(), 'wallet.kovan.empty.json')
  const configPath = path.join(process.cwd(), 'wallet.kovan.json')
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
    ...emptyData,
    seedKeystore: wallet,
    password: KEYSTORE_PASSWORD,
    accountNumber: ACCOUNT_NUMBER,
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
