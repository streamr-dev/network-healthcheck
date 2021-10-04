const axios = require('axios')
const { SlackBot } = require('@streamr/slackbot')
const program = require('commander')
const { parseResponseForFailures } = require('./helpers')

const { version: CURRENT_VERSION } = require('../package.json')
program
    .version(CURRENT_VERSION)
    .option('--queryTimeout <queryTimeout>', 'timeout for queries in milliseconds', '10000')
    .option('--queryInterval <queryInterval>', 'interval for queries in milliseconds', '120000')
    .option('--slackChannel <slackChannel>', 'Slack channel for notifications', '#network-log')
    .option('--urls <urls>', 'URLs to query as a string split with ,', (value) => value.split(','), [
        'https://corea1.streamr.network:30300',
        'https://corea2.streamr.network:30300',
    ])
    .option('--apiEndpoint <apiEndpoint>', 'endpoint for API', '/topology/')
    .option('--slackBotToken <slackBotToken>', 'OAuth token for slack app', '')
    .option('--name <name>', 'name for the health checker', 'Tracker Stream Overlap')
    .description('Run run resend health check')
    .parse(process.argv)

if (!program.opts().slackBotToken) {
    console.error('--slackBotToken must be specified')
    process.exit(1)
}

const { slackBotToken, apiEndpoint, urls, slackChannel, name } = program.opts()
const queryTimeout = parseInt(program.opts().queryTimeout, 10)
const queryInterval = parseInt(program.opts().queryInterval, 10)
const slackbot = new SlackBot(slackChannel, slackBotToken)
const previouslyFailed = {}

function checkPreviouslyFailed(url) {
    return url in previouslyFailed
}

setInterval(async () => {
    const requestPromises = urls.map(async (broker) => {
        return await axios.get(broker + apiEndpoint, { timeout: queryTimeout })
    })
    const responses = await Promise.allSettled(requestPromises)
    const failedQueryAlerts = []
    const backUp = []
    const data = []
    responses.forEach((res) => {
        const { url, error } = parseResponseForFailures(res, queryTimeout)
        if (error) {
            if (!checkPreviouslyFailed(url)) {
                failedQueryAlerts.push(error)
                previouslyFailed[url] = error
            }
        } else {
            if (checkPreviouslyFailed(url)) {
                delete previouslyFailed[url]
                backUp.push(`${url} back up`)
            }
            data.push(Object.keys(res.value.data))
        }
    })
    // Find intersection for stream-ids in tracker topologies
    const intersection = data.reduce((a, b) => a.filter(c => b.includes(c)))

    if (failedQueryAlerts.length > 0) {
        slackbot.alert(failedQueryAlerts, name)
        console.log(failedQueryAlerts)
    } else if (intersection.length > 0) {
        const message = `Overlapping streams on multiple trackers trackers for stream-ids: ${intersection}`
        slackbot.alert([message], name)
        console.log(message)
    } else if (Object.keys(previouslyFailed).length === 0) {
        console.log('Health check successful')
    }
    if (backUp.length > 0) {
        slackbot.notify(backUp, name)
        console.log(backUp)
    }

}, queryInterval)

slackbot.notify([`${name} healthcheck started with query interval ${queryInterval / 1000} seconds, query timeout ${queryTimeout / 1000} seconds`], name)
console.log(name + ' healthcheck started')