const axios = require('axios')
const { SlackBot } = require('./slackbot.js')

const slackbot = new SlackBot('UHD7R1QES')

const urls = [
    'https://corea1.streamr.network:8001',
    'https://corea1.streamr.network:8002',
    'https://corea1.streamr.network:8003',
    'https://corea1.streamr.network:8004',
    'https://corea2.streamr.network:8001',
    'https://corea2.streamr.network:8002',
    'https://corea2.streamr.network:8003',
    'https://corea2.streamr.network:8004'
]

const resendEndpoint = '/api/v1/streams/7wa7APtlTq6EC5iTCBy6dw/data/partitions/0/last'

function parseResponseForFailures(res) {
    if (res.status === 'rejected') {
        return `Query to ${res.reason.config.url} failed, unable to access endpoint or request timed out after 5000ms`
    } else if (res.value.status !== 200 || res.value.data.length === 0) {
        return `Query to ${res.value.config.url} failed with status ${res.value.status}`
    }
    return null
}


setInterval(async () => {
    const requestPromises = urls.map(async (broker) => {
        return await axios.get(broker + resendEndpoint, { timeout: 5000 })
    })

    const responses = await Promise.allSettled(requestPromises)

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
    }

}, 60000)

slackbot.notify(['Resend healthcheck started'])
console.log('Resend healthcheck started')