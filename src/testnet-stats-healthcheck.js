const axios = require('axios')
const { SlackBot } = require('@streamr/slackbot')
const program = require('commander')
const { parseResponseForFailures } = require('./helpers')
const { version: CURRENT_VERSION } = require('../package.json')

program
    .version(CURRENT_VERSION)
    .option('--queryTimeout <queryTimeout>', 'timeout for queries in milliseconds', '5000')
    .option('--queryInterval <queryInterval>', 'interval for queries in milliseconds', '60000')
    .option('--slackChannel <slackChannel>', 'Slack channel for notifications', '#testnet-log')
    .option('--url <url>', 'URL to query as a string split with', 'http://testnet1.streamr.network:3012')
    .option('--apiEndpoints <apiEndpoints>', 'endpoint for API',  (value) => value.split(','), [
        '/stats',
        '/leaderboard'
    ])
    .option('--slackBotToken <slackBotToken>', 'OAuth token for slack app', '')
    .option('--name <name>', 'name for the health checker', 'Stats Endpoint Healthcheck')
    .description('Stats endpoint healthcheck')
    .parse(process.argv)

if (!program.opts().slackBotToken) {
    console.error('--slackBotToken must be specified')
    process.exit(1)
}

const { slackBotToken, apiEndpoints, url, slackChannel, name } = program.opts()
const queryTimeout = parseInt(program.opts().queryTimeout, 10)
const queryInterval = parseInt(program.opts().queryInterval, 10)
const slackbot = new SlackBot(slackChannel, slackBotToken)

setInterval(async () => {
    const requestPromises = apiEndpoints.map(async (endpoint) => {
        console.log(url + endpoint)
        return await axios.get(url + endpoint, { timeout: queryTimeout })
    })
    const errors = []
    const responses = await Promise.allSettled(requestPromises)
    responses.forEach((res) => {
        const { error } = parseResponseForFailures(res, queryTimeout)
        if (error) {
            errors.push(error)
        }
    })
    slackbot.alert(errors, name)

}, queryInterval)

slackbot.notify([`${name} healthcheck started with query interval ${queryInterval / 1000} seconds, query timeout ${queryTimeout / 1000} seconds`], name)
console.log(name + ' healthcheck started')