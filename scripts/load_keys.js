const fs = require('fs-extra')
const path = require('path')
const tar = require('tar')
const { Docker } = require('node-docker-api')
const crypto = require('crypto')

const { IMAGE_NAME } = process.env

;(async () => {
  try {
    await loadKeys(path.join(__dirname, 'keys'))
  } catch (err) {
    console.log(err)
    console.error('Uncaught error')
    process.exit(1)
  }
})()

async function loadCircuits() {
  // It may take about an hour. If you want to skip building image,
  // run `yarn pull:images` on the root directory
  const docker = new Docker({
    socketPath: '/var/run/docker.sock',
  })
  const container = await docker.container.create({
    name: crypto.randomBytes(8).toString('hex'),
    Image: IMAGE_NAME,
  })
  const nIn = [1, 2, 3, 4]
  const nOut = [1, 2, 3, 4]
  const keyPath = path.join(path.dirname(__filename), '../keys')
  const zkeyPath = path.join(keyPath, 'zkeys')
  const vkPath = path.join(keyPath, 'vks')
  const ccPath = path.join(keyPath, 'circuits')
  if (!fs.existsSync(zkeyPath)) await fs.mkdirp(zkeyPath)
  if (!fs.existsSync(vkPath)) await fs.mkdirp(vkPath)
  if (!fs.existsSync(ccPath)) await fs.mkdirp(ccPath)
  for (const i of nIn) {
    for (const o of nOut) {
      const circuit = await readFromContainer(
        container,
        `/proj/build/circuits/zk_transaction_${i}_${o}.wasm`,
      )
      const zkey = await readFromContainer(
        container,
        `/proj/build/zkeys/zk_transaction_${i}_${o}.final.zkey`,
      )
      const vk = await readFromContainer(
        container,
        `/proj/build/vks/zk_transaction_${i}_${o}.vk.json`,
      )
      fs.writeFileSync(
        path.join(ccPath, `zk_transaction_${i}_${o}.wasm`),
        circuit,
      )
      fs.writeFileSync(
        path.join(zkeyPath, `zk_transaction_${i}_${o}.zkey`),
        zkey,
      )
      fs.writeFileSync(
        path.join(vkPath, `zk_transaction_${i}_${o}.vk.json`),
        vk,
      )
    }
  }
  await container.stop()
  await container.delete()
}

async function loadKeys(keyPath) {
  if (fs.existsSync(keyPath)) return
  await loadCircuits()
  tar
    .c({}, ['keys/zkeys', 'keys/vks', 'keys/circuits'])
    .pipe(fs.createWriteStream('keys.tgz'))
}

async function readFromContainer(container, filepath) {
  const data = []
  const stream = (await container.fs.get({ path: filepath }))
  return new Promise(res => {
    stream.pipe(
      tar.t({
        onentry: entry => {
          entry.on('data', c => data.push(c))
          entry.on('end', () => {
            res(Buffer.concat(data))
          })
        },
      }),
    )
  })
}
