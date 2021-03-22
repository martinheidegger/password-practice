import inquirer from 'inquirer'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import owasp from 'owasp-password-strength-test'

const file = './pwd'

async function run () {
  let data
  try {
    data = JSON.parse(await readFile(file, 'utf-8'))
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`Cant read "${file}": ${err.code}`)
    }
  }
  while (true) {
    if (!data) {
      data = await newPwd()
    }
    const practice = 'Practice'
    const newpwd = 'New Password'
    const exit = 'Exit'
    const clear = 'Clear data'
    const { op } = await inquirer.prompt([
      {
        name: 'op',
        type: 'list',
        message: 'Welcome!',
        choices: [practice, newpwd, exit, clear]
      }
    ])
    if (op === exit) {
      break
    }
    if (op === newpwd) {
      data = null
    }
    if (op === practice) {
      if (await practicePwd(data)) {
        break
      }
    }
    if (op === clear) {
      console.log('cleared file')
      await unlink(file)
      break
    }
  }
}

await run()

async function practicePwd (data) {
  while (true) {
    const { pwd } = await inquirer.prompt([
      {
        name: 'pwd',
        message: 'Enter password',
        transformer () {
          return ''
        }
      }
    ])
    const match = hash(pwd)
    const success = data.hash.hash === match.hash
    data.history.push({ date: (new Date()).toISOString(), success })
    await writeData(data)
    console.log(`

---->  ${success ? 'CORRECT!' : 'Wrong!'}

`)
    const tryAgain = 'Try Again'
    const back = 'Back'
    const quit = 'Quit'
    const { op } = await inquirer.prompt([
      {
        name: 'op',
        message: 'Next:',
        type: 'list',
        choices: [tryAgain, back, quit]
      }
    ])
    if (op === back) {
      return false
    }
    if (op === quit) {
      return true
    }
  }
}

function validate (pwd) {
  const { strong, errors } = owasp.test(pwd)
  if (errors.length > 0) {
    return errors[0]
  }
  return true
}

function hash (pwd, algo = 'sha256') {
  const hash = createHash(algo)
  hash.update(pwd)
  return {
    algo,
    hash: hash.digest('hex')
  }
}

async function writeData (data) {
  await writeFile(file, JSON.stringify(data, null, 2))
  return data
}

async function newPwd () {
  const { pwd } = await inquirer.prompt([
    {
      name: 'pwd',
      message: 'Enter new password',
      transformer (input) {
        const valid = validate(input)
        if (valid === true) {
          return '[OK]'
        }
        return `[${input.length}] ${valid}`
      }
    }
  ])
  return await writeData({
    created: (new Date()).toISOString(),
    hash: hash(pwd),
    history: []
  })
}

