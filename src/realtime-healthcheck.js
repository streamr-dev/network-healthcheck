const axios = require('axios')
const { SlackBot } = require('./slackbot.js')
const program = require('commander')
const StreamrClient = require('streamr-client')
require('dotenv').config()

const { version: CURRENT_VERSION } = require('../package.json')

program
    .version(CURRENT_VERSION)
    .option('--subscribeWait <subscribeWait>', 'timeout before checking for received messages', '2000')
    .option('--publishInterval <publishInterval>', 'interval for queries in milliseconds', '10000')
    .option('--slackChannel <slackChannel>', 'Slack channel for notifications', '#network-log')
    .option('--streamId <streamId>', 'Stream id', 'realtime-network-healthcheck')
    .option('--urls <urls>', 'Broker WS urls as string split with ,', (value) => value.split(','), [
        'wss://corea1.streamr.network:7001',
        'wss://corea1.streamr.network:7002',
        'wss://corea1.streamr.network:7003',
        'wss://corea1.streamr.network:7004',
        'wss://corea2.streamr.network:7001',
        'wss://corea2.streamr.network:7002',
        'wss://corea2.streamr.network:7003',
        'wss://corea2.streamr.network:7004'
    ])
    .option('--wsEndpoint <wsEndpoint>', 'broker WS endpoint', '/api/v1/ws')
    .option('--slackBotToken <slackBotToken>', 'OAuth token for slack app', '')
    .description('Run run resend health check')
    .parse(process.argv)


if (!program.opts().slackBotToken) {
    console.error('--slackBotToken must be specified')
    process.exit(1)
}

const { slackBotToken } = program.opts()
const { wsEndpoint } = program.opts()
const { urls } = program.opts()
const { streamId } = program.opts()
const subscribeWait = parseInt(program.opts().subscribeWait, 10)
const publishInterval = parseInt(program.opts().publishInterval, 10)
const { slackChannel } = program.opts()
const slackbot = new SlackBot(slackChannel, slackBotToken)
const EthKey = process.env.ETHEREUM_PRIVATE_KEY || StreamrClient.generateEthereumAccount().privateKey

async function run() {

    const publisher = new StreamrClient({
       auth: {
           privateKey: EthKey
       }
    })

    const subscribersHealth = {}
    const stream = await publisher.getOrCreateStream({
        name: streamId
    })
    console.log('Using stream with id ' + stream.id)

    urls.forEach((ws) => {
        subscribersHealth[ws] = 0

        const subscriber = new StreamrClient({
        url: ws + wsEndpoint,
        auth: {
               privateKey: EthKey
           }
        })
        subscriber.subscribe({
            stream: stream.id
        }, (message) => {
            subscribersHealth[ws] = message.health
        })
    })

    const previouslyFailed = {}
    let counter = 0
    setInterval(() => {
        const msg = {
            health: counter
        }
        publisher.publish(stream.id, msg)

        failed = []
        recovered = []
        setTimeout(() => {
            Object.keys(subscribersHealth).forEach((ws) => {
                const health = subscribersHealth[ws]
                if (health !== counter) {
                    if (!previouslyFailed[ws]) {
                        failed.push(`Published message with counter ${counter} was not received from broker endpoint ${ws} within ${2000 / 1000} seconds`)
                        previouslyFailed[ws] = subscribersHealth[ws]
                    }
                } else if (ws in previouslyFailed) {
                    recovered.push(`Broker at ${ws} recovered at counter ${counter}, in total ${counter - previouslyFailed} health checks dropped, estimated downtime: ${(counter - previouslyFailed) * (publishInterval / 1000)} seconds`)
                    delete previouslyFailed[ws]
                }
            })
            if (failed.length > 0) {
                slackbot.alert(failed, 'Real-Time')
                console.log(failed)
            } else if (Object.keys(previouslyFailed).length === 0) {
                console.log('All healthchecks successful')
            }
            if (recovered > 0) {
                slackbot.notify(recovered, 'Real-Time')
                console.log(recovered)
            }
            counter += 1
        }, subscribeWait)
    }, publishInterval)
    slackbot.notify([`Real-Time healthcheck started with streamId ${stream.id}, publish interval ${publishInterval / 1000} seconds, propagation wait ${subscribeWait / 1000} seconds`], 'Real-Time')
    console.log('Resend healthcheck started')
}

run()

