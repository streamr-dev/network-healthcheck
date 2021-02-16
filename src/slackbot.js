const { WebClient } = require('@slack/web-api')
require('dotenv').config()

class SlackBot {
    constructor(channel) {
        this.client =  new WebClient(process.env.SLACK_BOT_TOKEN)
        this.channel = channel
    }

    alert(message) {
        try {
            this.client.chat.postMessage({channel: this.channel, text: message})
        } catch (err) {
            console.error('Failed to send alert to channel', this.channel)
        }
    }
}
 module.exports = { SlackBot }

