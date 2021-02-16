const { WebClient } = require('@slack/web-api')
require('dotenv').config()

class SlackBot {
    constructor(channel) {
        this.client =  new WebClient(process.env.SLACK_BOT_TOKEN)
        this.channel = channel
    }

    formatMessages(messages) {
        let formatted = ''
        messages.forEach((message) => {
            formatted += '```' + message + '``` '
        })
        return formatted
    }

    alert(messages) {
        const alert = '*Alert:* ' + this.formatMessages(messages)
        try {
            this.client.chat.postMessage({channel: this.channel, text: alert})
        } catch (err) {
            console.error('Failed to send alert to channel', this.channel)
        }
    }

    notify(messages) {
        const notification = '*Notification:* ' + this.formatMessages(messages)
        try {
            this.client.chat.postMessage({channel: this.channel, text: notification})
        } catch (err) {
            console.error('Failed to send alert to channel', this.channel)
        }
    }
}
 module.exports = { SlackBot }

