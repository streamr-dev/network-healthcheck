const axios = require('axios')
const { SlackBot } = require('./slackbot.js')
const program = require('commander')

const { version: CURRENT_VERSION } = require('../package.json')

program
    .version(CURRENT_VERSION)
    .option('--queryTimeout <queryTimeout>', 'timeout for queries in milliseconds', '10000')
    .option('--queryInterval <queryInterval>', 'interval for queries in milliseconds', '60000')
    .option('--slackChannel <slackChannel>', 'Slack channel for notifications', 'UHD7R1QES')
    .option('--urls <urls>', 'URLs to query', (value) => value.split(','), [
        'https://corea1.streamr.network:8001',
        'https://corea1.streamr.network:8002',
        'https://corea1.streamr.network:8003',
        'https://corea1.streamr.network:8004',
        'https://corea2.streamr.network:8001',
        'https://corea2.streamr.network:8002',
        'https://corea2.streamr.network:8003',
        'https://corea2.streamr.network:8004'
    ])
    .option('--apiEndpoint <apiEndpoint>', 'endpoint for API', '/api/v1/streams/7wa7APtlTq6EC5iTCBy6dw/data/partitions/0/last')
    .description('Run run resend health check')
    .parse(process.argv)

const { apiEndpoint } = program.opts()
const { urls } = program.opts()
const queryTimeout = parseInt(program.opts().queryTimeout, 10)
const queryInterval = parseInt(program.opts().queryInterval, 10)
const { slackChannel } = program.opts()
const slackbot = new SlackBot(slackChannel)

function parseResponseForFailures(res) {
    if (res.status === 'rejected') {
        return `Query to ${res.reason.config.url} failed, request timed out after ${queryTimeout}ms`
    } else if (res.value.status !== 200 || res.value.data.length === 0) {
        return `Query to ${res.value.config.url} failed with status ${res.value.status}`
    }
    return null
}


setInterval(async () => {
    const requestPromises = urls.map(async (broker) => {
        return await axios.get(broker + apiEndpoint, { timeout: queryTimeout })
    })
    const responses = await Promise.allSettled(requestPromises)
    console.log()
    const failedQueryAlerts = []
    responses.forEach((res) => {
        const parsed = parseResponseForFailures(res)
        if (parsed) {
            failedQueryAlerts.push(parsed)
        }
    })
    if (failedQueryAlerts.length > 0) {
        slackbot.alert(failedQueryAlerts)
        console.log(failedQueryAlerts)
    } else {
        console.log('Health check successful')
    }

}, queryInterval)

slackbot.notify([`Resend healthcheck started with query interval ${queryInterval / 1000} seconds, query timeout ${queryTimeout / 1000} seconds`])
console.log('Resend healthcheck started')