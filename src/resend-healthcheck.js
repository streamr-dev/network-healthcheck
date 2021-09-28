const axios = require('axios')
const { SlackBot } = require('@streamr/slackbot')
const program = require('commander')

const { version: CURRENT_VERSION } = require('../package.json')

program
    .version(CURRENT_VERSION)
    .option('--queryTimeout <queryTimeout>', 'timeout for queries in milliseconds', '10000')
    .option('--queryInterval <queryInterval>', 'interval for queries in milliseconds', '60000')
    .option('--slackChannel <slackChannel>', 'Slack channel for notifications', '#network-log')
    .option('--urls <urls>', 'URLs to query as a string split with ,', (value) => value.split(','), [
        'https://corea1.streamr.network:8001',
        // 'https://corea1.streamr.network:8002',
        // 'https://corea1.streamr.network:8003',
        // 'https://corea1.streamr.network:8004',
        // 'https://corea2.streamr.network:8001',
        // 'https://corea2.streamr.network:8002',
        // 'https://corea2.streamr.network:8003',
        // 'https://corea2.streamr.network:8004'
    ])
    .option('--apiEndpoint <apiEndpoint>', 'endpoint for API', '/api/v1/streams/7wa7APtlTq6EC5iTCBy6dw/data/partitions/0/last')
    .option('--slackBotToken <slackBotToken>', 'OAuth token for slack app', '')
    .option('--name <name>', 'name for the health checker', 'Resend')
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

function parseResponseForFailures(res) {
    if (res.status === 'rejected') {
        return {
            error: `Query to ${res.reason.config.url} failed, request timed out after ${queryTimeout}ms`,
            url: res.reason.config.url
        }
    } else if (res.value.status !== 200) {
        return {
            error: `Query to ${res.value.config.url} failed with status ${res.value.status}`,
            url: res.value.config.url
        }
    } else if (res.value.data.length === 0) {
        return {
            error: `Query to ${res.value.config.url} failed with status ${res.value.status}, responded with an empty list`,
            url: res.value.config.url
        }
    }
    return {
        error: null,
        url: res.value.config.url
    }
}

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
    responses.forEach((res) => {
        const { url, error } = parseResponseForFailures(res)
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
        }
    })
    if (failedQueryAlerts.length > 0) {
        slackbot.alert(failedQueryAlerts, name)
        console.log(failedQueryAlerts)
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