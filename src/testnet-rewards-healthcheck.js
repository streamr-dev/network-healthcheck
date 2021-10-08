const axios = require('axios')
const { SlackBot } = require('@streamr/slackbot')
const program = require('commander')
const cmd = require('node-cmd')
const { version: CURRENT_VERSION } = require('../package.json')

program
    .version(CURRENT_VERSION)
    .option('--queryTimeout <queryTimeout>', 'timeout for queries in milliseconds', '10000')
    .option('--queryInterval <queryInterval>', 'interval for queries in milliseconds', '180000')
    .option('--slackChannel <slackChannel>', 'Slack channel for notifications', '#testnet-log')
    .option('--url <url>', 'URL to query as a string split with', 'http://localhost:3011')
    .option('--endpoint <endpoint>', 'endpoint for API',  '/ping')
    .option('--slackBotToken <slackBotToken>', 'OAuth token for slack app', '')
    .option('--name <name>', 'name for the health checker', 'Miner Backend')
    .option('--minerProcess <minerProcess>', 'Name of pm2 process', 'reward-backend')
    .description('Rewards backend healthcheck')
    .parse(process.argv)

if (!program.opts().slackBotToken) {
    console.error('--slackBotToken must be specified')
    process.exit(1)
}

const { slackBotToken, endpoint, url, slackChannel, name, minerProcess } = program.opts()
const queryTimeout = parseInt(program.opts().queryTimeout, 10)
const queryInterval = parseInt(program.opts().queryInterval, 10)
const slackbot = new SlackBot(slackChannel, slackBotToken)

setInterval(async () => {
    try {
        await axios.get(url + endpoint, { timeout: queryTimeout })
        console.log("Healthcheck successful")
    } catch (err) {
        console.error(err)
        slackbot.alert([err], name)
        const restart = cmd.runSync(`pm2 restart ${minerProcess}`)
        console.log(restart)
    }

}, queryInterval)

slackbot.notify([`${name} healthcheck started with query interval ${queryInterval / 1000} seconds, query timeout ${queryTimeout / 1000} seconds`], name)
console.log(name + ' healthcheck started')