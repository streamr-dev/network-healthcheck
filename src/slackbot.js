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
            formatted += '```' + this.dateTimeNow() + message + '``` '
        })
        return formatted
    }

    alert(messages, header='') {
        const alert = `*${header} Alert:* ` + this.formatMessages(messages)
        try {
            this.client.chat.postMessage({channel: this.channel, text: alert})
        } catch (err) {
            console.error('Failed to send alert to channel', this.channel)
        }
    }

    notify(messages, header= '') {
        const notification = `*${header} Notification:* ` + this.formatMessages(messages)
        try {
            this.client.chat.postMessage({channel: this.channel, text: notification})
        } catch (err) {
            console.error('Failed to send alert to channel', this.channel)
        }
    }

    dateTimeNow() {
        const date = new Date()
        return date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).slice(-2) + "-" + ("0" + date.getDate()).slice(-2) + "T" + ("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getMinutes()).slice(-2) + ":" + ("0" + date.getSeconds()).slice(-2) + " | "
    }
}
 module.exports = { SlackBot }

