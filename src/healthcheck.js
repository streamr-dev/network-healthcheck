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

const query = '/api/v1/streams/7wa7APtlTq6EC5iTCBy6dw/data/partitions/0/last'

slackbot.alert('Resend healthcheck started')
setInterval(() => {
    urls.forEach(async (broker) => {
        try {
            const res = await axios.get(broker + query)
            if (res.status !== 200 || res.data.length === 0) {
                const error = `Query to ${broker} failed with status ${res.status}`
                console.log(error)
                slackbot.alert(error)
            }
        } catch (err) {
            console.log(err)
            slackbot.alert(err)
        }
    })
}, 60 * 1000)